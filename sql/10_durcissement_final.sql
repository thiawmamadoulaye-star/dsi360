-- =========================================================================
-- DSI 360 — Phase 7 — Durcissement final (consolidation Phases 0 à 6)
-- AL_AMANA_TECH_SECURITE — Script à exécuter en dernier, après tous les
-- scripts 01 à 09, avant toute mise en production ou démonstration client.
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. DROIT À L'EFFACEMENT (CDP Sénégal / RGPD Art. 17)
-- -------------------------------------------------------------------------
create or replace function fn_anonymiser_utilisateur(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func_anonymiser$
declare
  v_acteur_role app_role;
begin
  select role into v_acteur_role from profiles where id = auth.uid();
  if v_acteur_role not in ('dsi','super_admin') then
    raise exception 'Action refusée : seul un DSI ou un Super Admin peut anonymiser un utilisateur.';
  end if;

  update profiles
  set nom = 'Utilisateur', prenom = 'Anonymisé',
      email = 'anonymise-' || substr(id::text, 1, 8) || '@supprime.local',
      statut = 'inactif',
      poste = null
  where id = p_profile_id;

  insert into logs_audit (tenant_id, user_id, action, table_cible, enregistrement_id)
  select tenant_id, auth.uid(), 'ANONYMISATION_RGPD', 'profiles', p_profile_id
  from profiles where id = p_profile_id;
end;
$func_anonymiser$;

comment on function fn_anonymiser_utilisateur is
  'Anonymise un profil utilisateur (droit à l''effacement CDP/RGPD) tout en conservant l''intégrité référentielle des journaux d''audit et données opérationnelles.';

-- -------------------------------------------------------------------------
-- 2. PURGE AUTOMATIQUE DES DONNÉES SELON LA DURÉE DE CONSERVATION
-- -------------------------------------------------------------------------
create or replace function fn_purger_donnees_anciennes(
  p_retention_logs_mois integer default 36,
  p_retention_notifications_jours integer default 90
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $func_purge$
declare
  v_logs_supprimes integer;
  v_notifs_supprimees integer;
begin
  delete from logs_audit
  where created_at < now() - (p_retention_logs_mois || ' months')::interval;
  get diagnostics v_logs_supprimes = row_count;

  delete from notifications
  where lu = true and created_at < now() - (p_retention_notifications_jours || ' days')::interval;
  get diagnostics v_notifs_supprimees = row_count;

  return jsonb_build_object(
    'logs_supprimes', v_logs_supprimes,
    'notifications_supprimees', v_notifs_supprimees,
    'date_execution', now()
  );
end;
$func_purge$;

comment on function fn_purger_donnees_anciennes is
  'Purge automatique conforme à la politique de conservation des données. À planifier mensuellement (pg_cron ou Edge Function).';

-- -------------------------------------------------------------------------
-- 3. DÉTECTION DES ENREGISTREMENTS ORPHELINS (intégrité multi-tenant)
-- -------------------------------------------------------------------------
create or replace function fn_detecter_incoherences_tenant()
returns table(table_cible text, nb_incoherences bigint)
language plpgsql
security definer
set search_path = public
as $func_incoherences$
begin
  return query
  select 'itsm_tickets'::text, count(*) from itsm_tickets t
    join cmdb_equipements e on e.id = t.equipement_id where t.tenant_id <> e.tenant_id
  union all
  select 'cyber_vulnerabilites', count(*) from cyber_vulnerabilites v
    join cmdb_equipements e on e.id = v.equipement_id where v.tenant_id <> e.tenant_id
  union all
  select 'audit_points_controle', count(*) from audit_points_controle p
    join audit_missions m on m.id = p.mission_id where p.tenant_id <> m.tenant_id
  union all
  select 'gouv_jalons', count(*) from gouv_jalons j
    join gouv_projets p on p.id = j.projet_id where j.tenant_id <> p.tenant_id
  union all
  select 'cmdb_contrats', count(*) from cmdb_contrats c
    join cmdb_fournisseurs f on f.id = c.fournisseur_id where c.tenant_id <> f.tenant_id;
end;
$func_incoherences$;

comment on function fn_detecter_incoherences_tenant is
  'Audit d''intégrité multi-tenant : doit toujours retourner 0 pour chaque ligne. À exécuter après chaque migration ou import massif de données.';

-- -------------------------------------------------------------------------
-- 4. CONTRAINTES DE VALIDATION SUPPLÉMENTAIRES (défense en profondeur)
-- -------------------------------------------------------------------------
alter table itsm_tickets drop constraint if exists chk_ticket_resolu_date;
alter table itsm_tickets add constraint chk_ticket_resolu_date
  check (statut not in ('resolu','ferme') or date_resolution is not null);

alter table dp_violations drop constraint if exists chk_violation_dates;
alter table dp_violations add constraint chk_violation_dates
  check (date_notification_cdp is null or date_notification_cdp >= date_incident::date);

alter table gouv_projets drop constraint if exists chk_projet_dates;
alter table gouv_projets add constraint chk_projet_dates
  check (date_debut is null or echeance is null or echeance >= date_debut);

alter table cmdb_contrats drop constraint if exists chk_contrat_dates;
alter table cmdb_contrats add constraint chk_contrat_dates
  check (date_debut is null or date_fin is null or date_fin >= date_debut);

alter table profiles drop constraint if exists chk_profiles_email_format;
alter table profiles add constraint chk_profiles_email_format
  check (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$');

-- -------------------------------------------------------------------------
-- 5. VERROUILLAGE DE COMPTE APRÈS ÉCHECS DE CONNEXION RÉPÉTÉS
-- -------------------------------------------------------------------------
alter table profiles
  add column if not exists tentatives_echouees integer default 0,
  add column if not exists verrouille_jusqu_a timestamptz;

create or replace function fn_enregistrer_echec_connexion(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $func_echec$
begin
  update profiles
  set tentatives_echouees = tentatives_echouees + 1,
      verrouille_jusqu_a = case
        when tentatives_echouees + 1 >= 5 then now() + interval '15 minutes'
        else verrouille_jusqu_a
      end
  where email = p_email;
end;
$func_echec$;

create or replace function fn_reinitialiser_echecs_connexion(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $func_reset$
begin
  update profiles set tentatives_echouees = 0, verrouille_jusqu_a = null where id = p_profile_id;
end;
$func_reset$;

comment on function fn_enregistrer_echec_connexion is
  'À appeler depuis une Edge Function ou un hook d''authentification après un échec de connexion. Verrouille 15 min après 5 échecs.';

-- -------------------------------------------------------------------------
-- 6. INDEX DE PERFORMANCE COMPLÉMENTAIRES
-- -------------------------------------------------------------------------
create index if not exists idx_notifications_user_lu_date on notifications(user_id, lu, created_at desc);
create index if not exists idx_logs_audit_table_enreg on logs_audit(table_cible, enregistrement_id);
create index if not exists idx_itsm_tickets_sla on itsm_tickets(tenant_id, sla_echeance) where statut not in ('resolu','ferme');
create index if not exists idx_dp_violations_echeance on dp_violations(tenant_id, echeance_notification_cdp) where notifie_cdp = false;
create index if not exists idx_gouv_contrats_echeance on cmdb_contrats(tenant_id, date_fin) where statut = 'actif';
create index if not exists idx_cyber_risques_niveau on cyber_risques(tenant_id, niveau, statut);

-- -------------------------------------------------------------------------
-- 7. VÉRIFICATION EXHAUSTIVE RLS
-- -------------------------------------------------------------------------
create or replace view vw_controle_rls_manquant as
select schemaname, tablename
from pg_tables
where schemaname = 'public'
  and tablename not like 'pg_%'
  and tablename not in ('audit_points_controle_template')
  and not exists (
    select 1 from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where c.relname = tablename and n.nspname = schemaname and c.relrowsecurity = true
  );

comment on view vw_controle_rls_manquant is
  'Doit toujours être vide en production. Liste les tables sans RLS activé — à vérifier après chaque migration.';

-- -------------------------------------------------------------------------
-- 8. FONCTION DE CONTRÔLE GLOBAL PRÉ-PRODUCTION
-- -------------------------------------------------------------------------
create or replace function fn_controle_preproduction()
returns jsonb
language plpgsql
security definer
set search_path = public
as $func_controle$
declare
  v_rls_manquant integer;
  v_incoherences integer;
begin
  select count(*) into v_rls_manquant from vw_controle_rls_manquant;
  select coalesce(sum(nb_incoherences), 0) into v_incoherences from fn_detecter_incoherences_tenant();

  return jsonb_build_object(
    'tables_sans_rls', v_rls_manquant,
    'incoherences_multi_tenant', v_incoherences,
    'statut', case when v_rls_manquant = 0 and v_incoherences = 0 then 'OK' else 'ATTENTION' end,
    'date_controle', now()
  );
end;
$func_controle$;

comment on function fn_controle_preproduction is
  'Point de contrôle unique à exécuter avant toute mise en production ou démonstration client. Doit retourner statut = OK.';

-- -------------------------------------------------------------------------
-- 9. RESTRICTION D'ACCÈS AUX FONCTIONS SECURITY DEFINER SENSIBLES
-- -------------------------------------------------------------------------
revoke all on function fn_anonymiser_utilisateur(uuid) from public, anon;
revoke all on function fn_purger_donnees_anciennes(integer, integer) from public, anon;
revoke all on function fn_controle_preproduction() from anon;
grant execute on function fn_controle_preproduction() to authenticated;