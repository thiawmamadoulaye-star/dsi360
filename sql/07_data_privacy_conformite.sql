-- =========================================================================
-- DSI 360 — Phase 4 — Data Privacy / Conformité (CDP Sénégal / RGPD)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. PLAN D'ACTION DE CONFORMITÉ — consolide les actions issues des DPIA,
--    des violations et des insuffisances constatées dans le registre.
-- -------------------------------------------------------------------------
create table if not exists dp_plans_action (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  origine text not null check (origine in ('registre_traitement','dpia','violation','audit_conformite','autre')),
  traitement_id uuid references dp_traitements(id),
  dpia_id uuid references dp_dpia(id),
  violation_id uuid references dp_violations(id),
  action text not null,
  priorite text not null default 'moyenne' check (priorite in ('faible','moyenne','elevee','critique')),
  responsable_id uuid references profiles(id),
  echeance date,
  statut text not null default 'a_faire' check (statut in ('a_faire','en_cours','fait','abandonne')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_dp_plans_tenant on dp_plans_action(tenant_id);
alter table dp_plans_action enable row level security;
create policy dp_plans_action_rw on dp_plans_action
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','dpo','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dpo','dsi'));

-- -------------------------------------------------------------------------
-- 2. CHAMPS COMPLÉMENTAIRES sur dp_violations : échéance légale de
--    notification à la CDP (72h, alignement RGPD/CDP Sénégal) + niveau de
--    gravité pour prioriser.
-- -------------------------------------------------------------------------
alter table dp_violations
  add column if not exists echeance_notification_cdp timestamptz,
  add column if not exists gravite text check (gravite in ('mineure','significative','majeure')),
  add column if not exists notifie_personnes_concernees boolean default false;

create or replace function fn_calculer_echeance_cdp()
returns trigger
language plpgsql
as $$
begin
  if new.echeance_notification_cdp is null then
    new.echeance_notification_cdp := new.date_incident + interval '72 hours';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_echeance_cdp on dp_violations;
create trigger trg_echeance_cdp
  before insert on dp_violations
  for each row execute function fn_calculer_echeance_cdp();

-- -------------------------------------------------------------------------
-- 3. NOTIFICATIONS AUTOMATIQUES — nouvelle violation (alerte immédiate DPO/DSI)
--    + rappel avant échéance des 72h (fonction planifiée, cf. §5)
-- -------------------------------------------------------------------------
create or replace function fn_notifier_nouvelle_violation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into notifications (tenant_id, user_id, type, titre, message, lien)
  select new.tenant_id, p.id, 'violation_donnees',
         '⚠ Nouvelle violation de données déclarée',
         left(new.description, 140) || ' — notification CDP requise avant le ' ||
         to_char(new.echeance_notification_cdp, 'DD/MM/YYYY HH24:MI'),
         '/data-privacy/violations/' || new.id
  from profiles p
  where p.tenant_id = new.tenant_id and p.role in ('dpo','dsi');
  return new;
end;
$$;

drop trigger if exists trg_notifier_violation on dp_violations;
create trigger trg_notifier_violation
  after insert on dp_violations
  for each row execute function fn_notifier_nouvelle_violation();

-- Alerte DPIA à revoir
create or replace function fn_notifier_dpia_a_revoir()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.statut = 'a_revoir' and old.statut is distinct from 'a_revoir' then
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    select new.tenant_id, p.id, 'dpia_a_revoir',
           'DPIA à revoir',
           'Une analyse d''impact nécessite une révision.',
           '/data-privacy/dpia/' || new.id
    from profiles p
    where p.tenant_id = new.tenant_id and p.role in ('dpo','dsi');
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_dpia on dp_dpia;
create trigger trg_notifier_dpia
  after update on dp_dpia
  for each row execute function fn_notifier_dpia_a_revoir();

-- Rappel d'échéance sur les actions du plan de conformité
create or replace function fn_notifier_plan_action_echeance()
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
    select pa.*, p.id as profile_id
    from dp_plans_action pa
    join profiles p on p.id = pa.responsable_id
    where pa.statut in ('a_faire','en_cours')
      and pa.echeance is not null
      and pa.echeance <= current_date + interval '7 days'
  loop
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    values (
      r.tenant_id, r.profile_id, 'plan_conformite_echeance',
      'Échéance proche — Plan de conformité',
      left(r.action, 140) || ' (échéance : ' || r.echeance || ')',
      '/data-privacy/plan-action'
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- 4. VUES DE TABLEAU DE BORD CONFORMITÉ
-- -------------------------------------------------------------------------
create or replace view vw_dp_tableau_bord as
select
  t.id as tenant_id,
  (select count(*) from dp_traitements d where d.tenant_id = t.id and d.statut = 'actif') as traitements_actifs,
  (select count(*) from dp_traitements d where d.tenant_id = t.id and d.transferts_hors_pays = true and d.statut = 'actif') as traitements_avec_transfert,
  (select count(*) from dp_violations v where v.tenant_id = t.id and v.statut <> 'cloturee') as violations_ouvertes,
  (select count(*) from dp_violations v where v.tenant_id = t.id and v.statut <> 'cloturee' and v.echeance_notification_cdp < now() and v.notifie_cdp = false) as violations_cdp_en_retard,
  (select count(*) from dp_dpia d where d.tenant_id = t.id and d.statut = 'en_cours') as dpia_en_cours,
  (select count(*) from dp_dpia d where d.tenant_id = t.id and d.statut = 'a_revoir') as dpia_a_revoir,
  (select count(*) from dp_plans_action pa where pa.tenant_id = t.id and pa.statut in ('a_faire','en_cours')) as actions_conformite_ouvertes,
  (select count(*) from dp_plans_action pa where pa.tenant_id = t.id and pa.statut in ('a_faire','en_cours') and pa.echeance < current_date) as actions_conformite_en_retard
from tenants t;

comment on view vw_dp_tableau_bord is
  'Synthèse conformité Data Privacy par tenant : registre, violations (avec suivi 72h CDP), DPIA, plan d''action.';

-- -------------------------------------------------------------------------
-- 5. FONCTION PLANIFIÉE — à appeler toutes les heures (Edge Function /
--    pg_cron) pour détecter les violations proches de l'échéance CDP (72h)
--    et les actions de conformité proches de leur échéance.
-- -------------------------------------------------------------------------
create or replace function fn_verifier_echeances_conformite()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_alertes_violations integer := 0;
  v_alertes_actions integer := 0;
  r record;
begin
  -- Violations dont l'échéance CDP approche (< 24h) et non encore notifiées
  for r in
    select v.*, p.id as profile_id
    from dp_violations v
    join profiles p on p.tenant_id = v.tenant_id and p.role in ('dpo','dsi')
    where v.notifie_cdp = false
      and v.statut <> 'cloturee'
      and v.echeance_notification_cdp between now() and now() + interval '24 hours'
  loop
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    values (
      r.tenant_id, r.profile_id, 'violation_cdp_urgent',
      '🔴 Échéance CDP dans moins de 24h',
      left(r.description, 140),
      '/data-privacy/violations/' || r.id
    );
    v_alertes_violations := v_alertes_violations + 1;
  end loop;

  v_alertes_actions := fn_notifier_plan_action_echeance();

  return jsonb_build_object(
    'alertes_violations_cdp', v_alertes_violations,
    'alertes_plan_action', v_alertes_actions
  );
end;
$$;

-- Exemple de planification via pg_cron (si disponible) :
-- select cron.schedule('verif-conformite-dataprivacy', '0 * * * *', $$select fn_verifier_echeances_conformite();$$);

-- -------------------------------------------------------------------------
-- 6. Journalisation étendue aux tables Phase 4
-- -------------------------------------------------------------------------
do $$
declare
  t text;
  tables_a_logger text[] := array['dp_traitements','dp_violations','dp_dpia','dp_plans_action'];
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