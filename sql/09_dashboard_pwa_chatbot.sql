-- =========================================================================
-- DSI 360 — Phase 6 — Dashboard exécutif avancé, PWA & Chatbot assistant
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. VUE DASHBOARD EXÉCUTIF CONSOLIDÉ — remplace/enrichit vw_dashboard_executif
--    (Phase 0) en agrégeant tous les modules livrés (Phases 1 à 5).
-- -------------------------------------------------------------------------
create or replace view vw_dashboard_executif_v2 as
select
  t.id as tenant_id,
  t.nom as tenant_nom,

  -- ParcIT / CMDB
  (select count(*) from cmdb_equipements e where e.tenant_id = t.id and e.deleted_at is null) as nb_equipements,
  (select count(*) from cmdb_equipements e where e.tenant_id = t.id and e.statut = 'obsolete' and e.deleted_at is null) as nb_equipements_obsoletes,

  -- Helpdesk ITSM
  (select count(*) from itsm_tickets tk where tk.tenant_id = t.id and tk.statut not in ('resolu','ferme')) as tickets_ouverts,
  (select count(*) from itsm_tickets tk where tk.tenant_id = t.id and tk.statut = 'escalade') as tickets_escalades,

  -- Cybersécurité & Audit SI
  (select count(*) from cyber_risques r where r.tenant_id = t.id and r.statut = 'ouvert' and r.niveau in ('eleve','critique')) as risques_critiques_ouverts,
  (select round(avg(m.maturite_globale)::numeric, 2) from audit_missions m where m.tenant_id = t.id and m.statut in ('en_cours','synthese','cloture')) as maturite_audit_moyenne,
  (select count(*) from cyber_vulnerabilites v where v.tenant_id = t.id and v.statut = 'ouverte') as vulnerabilites_ouvertes,

  -- Data Privacy / Conformité
  (select count(*) from dp_violations v where v.tenant_id = t.id and v.statut <> 'cloturee') as violations_donnees_ouvertes,
  (select count(*) from dp_violations v where v.tenant_id = t.id and v.statut <> 'cloturee' and v.echeance_notification_cdp < now() and v.notifie_cdp = false) as violations_cdp_en_retard,
  (select count(*) from dp_plans_action pa where pa.tenant_id = t.id and pa.statut in ('a_faire','en_cours')) as actions_conformite_ouvertes,

  -- Gouvernance IT & PMO
  (select count(*) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as projets_en_cours,
  (select count(*) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_retard') as projets_en_retard,
  (select coalesce(sum(budget_capex + budget_opex),0) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as budget_projets_en_cours,
  (select coalesce(sum(cout_reel),0) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as cout_reel_projets_en_cours,
  (select count(*) from cmdb_contrats c where c.tenant_id = t.id and c.statut = 'actif' and c.date_fin between current_date and current_date + interval '60 days') as contrats_a_echeance

from tenants t;

comment on view vw_dashboard_executif_v2 is
  'Dashboard exécutif consolidé (Phase 6) : synthèse de tous les modules DSI 360 pour le rôle DG et le pilotage DSI.';

grant select on vw_dashboard_executif_v2 to authenticated;

-- -------------------------------------------------------------------------
-- 2. RÉPARTITION DES RISQUES CYBER PAR NIVEAU (pour graphique donut)
-- -------------------------------------------------------------------------
create or replace view vw_dashboard_risques_repartition as
select tenant_id, niveau, count(*) as nb
from cyber_risques
where statut in ('ouvert', 'en_traitement')
group by tenant_id, niveau;

-- -------------------------------------------------------------------------
-- 3. TENDANCE DES TICKETS HELPDESK (7 derniers jours, pour graphique en barres)
-- -------------------------------------------------------------------------
create or replace view vw_dashboard_tickets_tendance as
select
  tenant_id,
  date_trunc('day', created_at)::date as jour,
  count(*) as nb_crees,
  count(*) filter (where statut in ('resolu','ferme')) as nb_resolus
from itsm_tickets
where created_at >= current_date - interval '30 days'
group by tenant_id, date_trunc('day', created_at)::date
order by jour;

-- -------------------------------------------------------------------------
-- 4. WIDGETS DASHBOARD PARAMÉTRABLES — ordre/affichage par tenant/rôle
--    (réutilise parametres_tenant avec la clé 'dashboard_layout')
-- -------------------------------------------------------------------------
-- Exemple de valeur stockée dans parametres_tenant :
-- { "widgets_ordre": ["parcit","helpdesk","cyber","conformite","gouvernance"] }
comment on table parametres_tenant is
  'Stocke les préférences UI/métier par tenant : colonnes visibles, seuils obsolescence,
   disposition dashboard (cle=''dashboard_layout''), options de statut personnalisées.';

-- -------------------------------------------------------------------------
-- 5. CHATBOT ASSISTANT — conversations, messages, base de connaissances FAQ
-- -------------------------------------------------------------------------
create table if not exists chatbot_conversations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  titre text default 'Nouvelle conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_chatbot_conv_user on chatbot_conversations(user_id);

create table if not exists chatbot_messages (
  id uuid primary key default uuid_generate_v4(),
  conversation_id uuid not null references chatbot_conversations(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  role text not null check (role in ('user','assistant')),
  contenu text not null,
  intention_detectee text, -- ex: 'tickets_ouverts', 'maturite_audit', 'faq', 'inconnue'
  created_at timestamptz not null default now()
);
create index if not exists idx_chatbot_msg_conv on chatbot_messages(conversation_id);

-- Base de connaissances FAQ (réponses statiques configurables par le Cabinet)
create table if not exists chatbot_faq (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid references tenants(id) on delete cascade, -- null = FAQ globale (tous tenants)
  mots_cles text[] not null,
  question_type text not null,
  reponse text not null,
  ordre integer default 0,
  actif boolean default true
);

alter table chatbot_conversations enable row level security;
alter table chatbot_messages enable row level security;
alter table chatbot_faq enable row level security;

create policy chatbot_conv_self on chatbot_conversations
  for all using (user_id = auth.uid()) with check (user_id = auth.uid() and tenant_id = current_tenant_id());

create policy chatbot_msg_self on chatbot_messages
  for all using (
    conversation_id in (select id from chatbot_conversations where user_id = auth.uid())
  )
  with check (
    conversation_id in (select id from chatbot_conversations where user_id = auth.uid())
  );

create policy chatbot_faq_select on chatbot_faq
  for select using (tenant_id is null or tenant_id = current_tenant_id());
create policy chatbot_faq_write_admin on chatbot_faq
  for all using (is_super_admin() or (tenant_id = current_tenant_id() and app_current_role() = 'dsi'))
  with check (is_super_admin() or (tenant_id = current_tenant_id() and app_current_role() = 'dsi'));

-- FAQ globale de base (visible par tous les tenants)
insert into chatbot_faq (tenant_id, mots_cles, question_type, reponse, ordre) values
(null, array['obsolescence','bios','seuil'], 'faq_obsolescence',
  'Un équipement est considéré obsolète lorsque l''âge de son BIOS dépasse le seuil configuré (5 ans par défaut). Vous pouvez ajuster ce seuil dans Paramètres > ParcIT.', 1),
(null, array['sla','helpdesk','ticket','delai'], 'faq_sla',
  'Le SLA d''un ticket est déterminé par la catégorie de service choisie à la création. Vous pouvez consulter et modifier les SLA dans Helpdesk > Catalogue de services.', 2),
(null, array['cdp','violation','72h','notification'], 'faq_cdp',
  'Toute violation de données à risque doit être notifiée à la CDP dans un délai de 72h après sa détection. Ce délai est calculé automatiquement dans le module Data Privacy.', 3),
(null, array['role','permission','droit','acces'], 'faq_roles',
  'Les rôles disponibles sont : Super Admin, DSI, RSSI, DPO, IT Manager, Technicien, Contrôleur interne, DG. Chaque rôle a des droits spécifiques configurés par votre DSI dans Administration > Utilisateurs.', 4),
(null, array['maturite','audit','domaine','iso'], 'faq_maturite',
  'La maturité est notée de 0 (inexistant) à 5 (optimisé) pour chaque point de contrôle. La maturité globale d''une mission est la moyenne de tous les points évalués sur les 2 volets (technique + organisationnel).', 5);

-- -------------------------------------------------------------------------
-- 6. FONCTION SQL D'AIDE AU CHATBOT — renvoie les compteurs en direct
--    (utilisée par l'Edge Function chatbot-assistant pour répondre à des
--    questions du type "combien de tickets ouverts ?")
-- -------------------------------------------------------------------------
create or replace function fn_chatbot_contexte_tenant(p_tenant_id uuid)
returns jsonb
language sql
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'tickets_ouverts', (select count(*) from itsm_tickets where tenant_id = p_tenant_id and statut not in ('resolu','ferme')),
    'tickets_escalades', (select count(*) from itsm_tickets where tenant_id = p_tenant_id and statut = 'escalade'),
    'equipements_obsoletes', (select count(*) from cmdb_equipements where tenant_id = p_tenant_id and statut = 'obsolete' and deleted_at is null),
    'risques_critiques', (select count(*) from cyber_risques where tenant_id = p_tenant_id and statut = 'ouvert' and niveau in ('eleve','critique')),
    'violations_ouvertes', (select count(*) from dp_violations where tenant_id = p_tenant_id and statut <> 'cloturee'),
    'violations_cdp_en_retard', (select count(*) from dp_violations where tenant_id = p_tenant_id and statut <> 'cloturee' and echeance_notification_cdp < now() and notifie_cdp = false),
    'projets_en_retard', (select count(*) from gouv_projets where tenant_id = p_tenant_id and statut = 'en_retard'),
    'contrats_a_echeance', (select count(*) from cmdb_contrats where tenant_id = p_tenant_id and statut = 'actif' and date_fin between current_date and current_date + interval '60 days'),
    'maturite_audit_moyenne', (select round(avg(maturite_globale)::numeric, 2) from audit_missions where tenant_id = p_tenant_id)
  );
$$;

-- -------------------------------------------------------------------------
-- 7. PUSH NOTIFICATIONS PWA — abonnements par utilisateur/appareil
-- -------------------------------------------------------------------------
create table if not exists push_subscriptions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);
alter table push_subscriptions enable row level security;
create policy push_subscriptions_self on push_subscriptions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid() and tenant_id = current_tenant_id());

-- -------------------------------------------------------------------------
-- 8. Journalisation étendue Phase 6
-- -------------------------------------------------------------------------
do $$
declare
  t text;
  tables_a_logger text[] := array['chatbot_faq'];
begin
  foreach t in array tables_a_logger loop
    execute format(
      'drop trigger if exists trg_log_%1$s on %1$s;
       create trigger trg_log_%1$s
       after insert or update or delete on %1$s
       for each row execute function fn_log_audit();', t
    );
  end loop;
end $$;