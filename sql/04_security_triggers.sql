-- =========================================================================
-- DSI 360 — Phase 0/1 — Durcissement : anti-élévation de privilèges + logs
-- (généralisation du script déjà en place sur ParcIT)
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. TRIGGER ANTI-ÉLÉVATION DE PRIVILÈGES SUR profiles
--    Empêche un utilisateur non-DSI/super_admin de modifier son propre rôle
--    ou celui d'un tiers, même en cas de contournement applicatif.
-- -------------------------------------------------------------------------
create or replace function fn_bloquer_elevation_privilege()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  acteur_role app_role;
begin
  select role into acteur_role from profiles where id = auth.uid();

  if (new.role is distinct from old.role) and acteur_role not in ('dsi','super_admin') then
    raise exception 'Action refusée : seul un DSI ou un Super Admin peut modifier un rôle.';
  end if;

  if (new.tenant_id is distinct from old.tenant_id) and acteur_role <> 'super_admin' then
    raise exception 'Action refusée : le changement de tenant est réservé au Super Admin.';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_bloquer_elevation on profiles;
create trigger trg_bloquer_elevation
  before update on profiles
  for each row execute function fn_bloquer_elevation_privilege();

-- -------------------------------------------------------------------------
-- 2. TRIGGER JOURNALISATION GÉNÉRIQUE (INSERT/UPDATE/DELETE)
--    À attacher à chaque table sensible via le helper ci-dessous.
-- -------------------------------------------------------------------------
create or replace function fn_log_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_tenant uuid;
begin
  v_tenant := coalesce(new.tenant_id, old.tenant_id);

  insert into logs_audit(tenant_id, user_id, action, table_cible, enregistrement_id, ancienne_valeur, nouvelle_valeur)
  values (
    v_tenant,
    auth.uid(),
    tg_op,
    tg_table_name,
    coalesce(new.id, old.id),
    case when tg_op in ('UPDATE','DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('UPDATE','INSERT') then to_jsonb(new) else null end
  );

  return coalesce(new, old);
end;
$$;

-- Attacher le trigger de journalisation aux tables critiques
do $$
declare
  t text;
  tables_a_logger text[] := array[
    'cmdb_equipements','cmdb_applications','cmdb_contrats',
    'itsm_tickets','audit_points_controle','cyber_risques',
    'dp_traitements','dp_violations','gouv_projets','profiles'
  ];
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

-- -------------------------------------------------------------------------
-- 3. SOFT DELETE + CORBEILLE + RESTAURATION (droit accordé explicitement)
--    Le champ profiles.peut_restaurer_suppressions contrôle ce droit,
--    accordé par défaut à DSI / IT Manager / super_admin.
-- -------------------------------------------------------------------------
create or replace function fn_soft_delete_equipement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update cmdb_equipements
  set deleted_at = now(), deleted_by = auth.uid()
  where id = p_id and tenant_id = current_tenant_id();
end;
$$;

create or replace function fn_restaurer_equipement(p_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  autorise boolean;
begin
  select peut_restaurer_suppressions into autorise from profiles where id = auth.uid();
  if not coalesce(autorise, false) then
    raise exception 'Action refusée : droit de restauration non accordé à cet utilisateur.';
  end if;

  update cmdb_equipements
  set deleted_at = null, deleted_by = null
  where id = p_id and tenant_id = current_tenant_id();
end;
$$;

-- -------------------------------------------------------------------------
-- 4. SUPPRESSION MULTIPLE (sélection de lignes) — fonction sécurisée
--    utilisée par la fonctionnalité "supprimer plusieurs lignes en même temps"
-- -------------------------------------------------------------------------
create or replace function fn_soft_delete_equipements_bulk(p_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update cmdb_equipements
  set deleted_at = now(), deleted_by = auth.uid()
  where id = any(p_ids) and tenant_id = current_tenant_id();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- -------------------------------------------------------------------------
-- 5. SAUVEGARDE AUTOMATIQUE (rappel opérationnel)
--    Supabase gère les sauvegardes automatiques au niveau plateforme (plan Pro).
--    Documenter dans le guide utilisateur : fréquence, rétention, procédure
--    de restauration Point-in-Time Recovery (PITR) selon le plan souscrit.
-- -------------------------------------------------------------------------
