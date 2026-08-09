-- =========================================================================
-- DSI 360 — Phase 5 — Gouvernance IT & PMO
-- Portefeuille de projets, budget CAPEX/OPEX, contrats fournisseurs,
-- comités IT/COPIL (lien logique avec AFFIC — Gestion CA existant)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. SUIVI D'AVANCEMENT DES PROJETS — jalons + % d'avancement
-- -------------------------------------------------------------------------
create table if not exists gouv_jalons (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  projet_id uuid not null references gouv_projets(id) on delete cascade,
  titre text not null,
  date_prevue date,
  date_reelle date,
  statut text not null default 'a_venir' check (statut in ('a_venir','en_cours','atteint','en_retard','abandonne')),
  ordre integer default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_jalons_projet on gouv_jalons(projet_id);
alter table gouv_jalons enable row level security;
create policy gouv_jalons_rw on gouv_jalons
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi'));

-- % d'avancement calculé automatiquement à partir des jalons atteints
alter table gouv_projets
  add column if not exists avancement_pct integer default 0,
  add column if not exists priorite text default 'moyenne' check (priorite in ('faible','moyenne','elevee','strategique'));

create or replace function fn_calculer_avancement_projet(p_projet_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total integer;
  v_atteints integer;
  v_pct integer;
begin
  select count(*), count(*) filter (where statut = 'atteint')
  into v_total, v_atteints
  from gouv_jalons where projet_id = p_projet_id;

  v_pct := case when v_total > 0 then round((v_atteints::numeric / v_total) * 100) else 0 end;

  update gouv_projets set avancement_pct = v_pct, updated_at = now()
  where id = p_projet_id;
end;
$$;

create or replace function fn_trigger_avancement_projet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform fn_calculer_avancement_projet(coalesce(new.projet_id, old.projet_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_avancement_projet on gouv_jalons;
create trigger trg_avancement_projet
  after insert or update or delete on gouv_jalons
  for each row execute function fn_trigger_avancement_projet();

-- Détection automatique des jalons en retard (jalon non atteint après la date prévue)
create or replace function fn_detecter_jalons_en_retard()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update gouv_jalons
  set statut = 'en_retard'
  where statut in ('a_venir','en_cours')
    and date_prevue < current_date;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- 2. ALERTES BUDGÉTAIRES — dépassement CAPEX/OPEX
-- -------------------------------------------------------------------------
create or replace function fn_verifier_depassements_budget()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  for r in
    select p.*, (p.cout_reel - (p.budget_capex + p.budget_opex)) as depassement
    from gouv_projets p
    where p.statut = 'en_cours'
      and p.cout_reel > (p.budget_capex + p.budget_opex)
  loop
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    select r.tenant_id, prof.id, 'depassement_budget',
           '⚠ Dépassement budgétaire — ' || r.nom,
           'Coût réel (' || r.cout_reel || ') supérieur au budget alloué (' || (r.budget_capex + r.budget_opex) || '). Dépassement : ' || r.depassement,
           '/gouvernance/projets/' || r.id
    from profiles prof
    where prof.tenant_id = r.tenant_id and prof.role in ('dsi','super_admin');
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- 3. ALERTES CONTRATS FOURNISSEURS — échéance proche (< 60 jours) ou expirés
-- -------------------------------------------------------------------------
create or replace function fn_verifier_contrats_echeance()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer := 0;
  r record;
begin
  -- Marquer comme expirés les contrats dont la date de fin est dépassée
  update cmdb_contrats
  set statut = 'expire'
  where statut = 'actif' and date_fin < current_date;

  for r in
    select c.*, f.nom as fournisseur_nom
    from cmdb_contrats c
    left join cmdb_fournisseurs f on f.id = c.fournisseur_id
    where c.statut = 'actif'
      and c.date_fin between current_date and current_date + interval '60 days'
  loop
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    select r.tenant_id, prof.id, 'contrat_echeance',
           '📄 Contrat arrivant à échéance — ' || r.objet,
           'Contrat avec ' || coalesce(r.fournisseur_nom, 'fournisseur non renseigné') || ' expire le ' || r.date_fin,
           '/gouvernance/contrats'
    from profiles prof
    where prof.tenant_id = r.tenant_id and prof.role in ('dsi','it_manager')
    on conflict do nothing;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- 4. FONCTION PLANIFIÉE GLOBALE PMO — à appeler quotidiennement
-- -------------------------------------------------------------------------
create or replace function fn_verifier_alertes_gouvernance()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_jalons integer;
  v_budgets integer;
  v_contrats integer;
begin
  v_jalons := fn_detecter_jalons_en_retard();
  v_budgets := fn_verifier_depassements_budget();
  v_contrats := fn_verifier_contrats_echeance();
  return jsonb_build_object(
    'jalons_en_retard', v_jalons,
    'projets_en_depassement', v_budgets,
    'contrats_a_echeance', v_contrats
  );
end;
$$;

-- Exemple pg_cron (si disponible) : exécution quotidienne à 7h
-- select cron.schedule('verif-gouvernance-pmo', '0 7 * * *', $$select fn_verifier_alertes_gouvernance();$$);

-- -------------------------------------------------------------------------
-- 5. VUE PORTEFEUILLE DE PROJETS (synthèse PMO)
-- -------------------------------------------------------------------------
create or replace view vw_gouv_portefeuille as
select
  p.tenant_id,
  p.id as projet_id,
  p.nom,
  p.statut,
  p.priorite,
  p.avancement_pct,
  p.budget_capex,
  p.budget_opex,
  (p.budget_capex + p.budget_opex) as budget_total,
  p.cout_reel,
  round(case when (p.budget_capex + p.budget_opex) > 0
        then (p.cout_reel / (p.budget_capex + p.budget_opex)) * 100
        else 0 end, 1) as consommation_budget_pct,
  p.echeance,
  (p.echeance < current_date and p.statut not in ('termine','abandonne')) as en_retard
from gouv_projets p;

-- -------------------------------------------------------------------------
-- 6. VUE TABLEAU DE BORD GOUVERNANCE (consolidation pour dashboard exécutif)
-- -------------------------------------------------------------------------
create or replace view vw_gouv_tableau_bord as
select
  t.id as tenant_id,
  (select count(*) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as projets_en_cours,
  (select count(*) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_retard') as projets_en_retard,
  (select coalesce(sum(budget_capex + budget_opex), 0) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as budget_total_en_cours,
  (select coalesce(sum(cout_reel), 0) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as cout_reel_en_cours,
  (select count(*) from cmdb_contrats c where c.tenant_id = t.id and c.statut = 'actif' and c.date_fin between current_date and current_date + interval '60 days') as contrats_a_echeance,
  (select count(*) from cmdb_contrats c where c.tenant_id = t.id and c.statut = 'expire') as contrats_expires,
  (select count(*) from gouv_comites co where co.tenant_id = t.id and co.statut = 'planifie' and co.date_reunion >= current_date) as comites_planifies
from tenants t;

comment on view vw_gouv_tableau_bord is
  'Synthèse Gouvernance IT & PMO par tenant : projets, budgets, contrats, comités.';

-- -------------------------------------------------------------------------
-- 7. NOTIFICATION — nouveau compte-rendu de comité disponible
-- -------------------------------------------------------------------------
create or replace function fn_notifier_compte_rendu_comite()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'compte_rendu_valide' and old.statut is distinct from 'compte_rendu_valide' then
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    select new.tenant_id, prof.id, 'compte_rendu_comite',
           'Compte-rendu disponible — ' || coalesce(new.titre, new.type_comite),
           'Le compte-rendu du ' || new.date_reunion || ' est disponible.',
           '/gouvernance/comites'
    from profiles prof
    where prof.tenant_id = new.tenant_id and prof.role in ('dsi','dg','super_admin');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_comite on gouv_comites;
create trigger trg_notifier_comite
  after update on gouv_comites
  for each row execute function fn_notifier_compte_rendu_comite();

-- -------------------------------------------------------------------------
-- 8. Journalisation étendue aux tables Phase 5
-- -------------------------------------------------------------------------
do $$
declare
  t text;
  tables_a_logger text[] := array['gouv_projets','gouv_jalons','gouv_budget_lignes','gouv_comites','cmdb_contrats'];
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