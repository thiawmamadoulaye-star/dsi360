-- =========================================================================
-- DSI 360 — Phase 2 — Helpdesk ITSM : numérotation, SLA, escalade, notifications
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. NUMÉROTATION AUTOMATIQUE DES TICKETS (format TCK-AAAA-#### par tenant)
-- -------------------------------------------------------------------------
create table if not exists itsm_compteur_tickets (
  tenant_id uuid primary key references tenants(id) on delete cascade,
  annee integer not null,
  dernier_numero integer not null default 0
);

create or replace function fn_generer_numero_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_annee integer := extract(year from now());
  v_numero integer;
begin
  insert into itsm_compteur_tickets (tenant_id, annee, dernier_numero)
  values (new.tenant_id, v_annee, 1)
  on conflict (tenant_id) do update
    set dernier_numero = case
          when itsm_compteur_tickets.annee = v_annee then itsm_compteur_tickets.dernier_numero + 1
          else 1
        end,
        annee = v_annee
  returning dernier_numero into v_numero;

  new.numero := 'TCK-' || v_annee || '-' || lpad(v_numero::text, 4, '0');
  return new;
end;
$$;

drop trigger if exists trg_generer_numero_ticket on itsm_tickets;
create trigger trg_generer_numero_ticket
  before insert on itsm_tickets
  for each row
  when (new.numero is null)
  execute function fn_generer_numero_ticket();

-- -------------------------------------------------------------------------
-- 2. CALCUL AUTOMATIQUE DE L'ÉCHÉANCE SLA À LA CRÉATION
--    (basé sur le SLA de la catégorie de service choisie, ex. 4h/24h/72h)
-- -------------------------------------------------------------------------
create or replace function fn_appliquer_sla()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sla_heures integer;
begin
  if new.sla_echeance is null then
    select sla_heures into v_sla_heures
    from itsm_categories_services
    where id = new.categorie_id;

    new.sla_echeance := now() + (coalesce(v_sla_heures, 24) || ' hours')::interval;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_appliquer_sla on itsm_tickets;
create trigger trg_appliquer_sla
  before insert on itsm_tickets
  for each row execute function fn_appliquer_sla();

-- -------------------------------------------------------------------------
-- 3. NOTIFICATIONS AUTOMATIQUES (assignation, escalade, résolution)
-- -------------------------------------------------------------------------
create or replace function fn_notifier_ticket()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Nouvelle assignation (ou changement d'assignation)
  if new.assigne_a is not null and (old.assigne_a is distinct from new.assigne_a) then
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    values (
      new.tenant_id, new.assigne_a, 'ticket_assigne',
      'Ticket ' || new.numero || ' vous a été assigné',
      left(new.titre, 140),
      '/helpdesk/' || new.id
    );
  end if;

  -- Escalade automatique (déclenchée par fn_verifier_sla_echus, cf. §4)
  if new.statut = 'escalade' and old.statut is distinct from 'escalade' then
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    select new.tenant_id, p.id, 'ticket_escalade',
           'SLA dépassé — Ticket ' || new.numero,
           'Le ticket "' || new.titre || '" a dépassé son délai SLA et a été escaladé.',
           '/helpdesk/' || new.id
    from profiles p
    where p.tenant_id = new.tenant_id and p.role in ('dsi','it_manager');
  end if;

  -- Résolution (notifie le demandeur)
  if new.statut = 'resolu' and old.statut is distinct from 'resolu' then
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    values (
      new.tenant_id, new.demandeur_id, 'ticket_resolu',
      'Votre ticket ' || new.numero || ' a été résolu',
      left(new.titre, 140),
      '/helpdesk/' || new.id
    );
  end if;

  return new;
end;
$$;

drop trigger if exists trg_notifier_ticket on itsm_tickets;
create trigger trg_notifier_ticket
  after update on itsm_tickets
  for each row execute function fn_notifier_ticket();

-- Notifier aussi à la création si le ticket est déjà assigné
create or replace function fn_notifier_ticket_creation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.assigne_a is not null then
    insert into notifications (tenant_id, user_id, type, titre, message, lien)
    values (
      new.tenant_id, new.assigne_a, 'ticket_assigne',
      'Nouveau ticket ' || new.numero || ' vous a été assigné',
      left(new.titre, 140),
      '/helpdesk/' || new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notifier_ticket_creation on itsm_tickets;
create trigger trg_notifier_ticket_creation
  after insert on itsm_tickets
  for each row execute function fn_notifier_ticket_creation();

-- -------------------------------------------------------------------------
-- 4. WORKFLOW D'ESCALADE — vérification périodique des SLA dépassés
--    À exécuter via pg_cron (ex. toutes les 15 minutes) ou déclenché par une
--    Edge Function planifiée (voir supabase/functions/verifier-sla-tickets).
-- -------------------------------------------------------------------------
create or replace function fn_verifier_sla_echus()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update itsm_tickets
  set statut = 'escalade'
  where statut in ('ouvert','en_cours','en_attente')
    and sla_echeance < now();
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Exemple de planification via pg_cron (à activer si l'extension est disponible
-- sur votre plan Supabase) :
-- select cron.schedule('verif-sla-tickets', '*/15 * * * *', $$select fn_verifier_sla_echus();$$);
-- À défaut de pg_cron, appeler cette fonction via une Edge Function planifiée
-- (cron Netlify/Supabase Scheduled Function) toutes les 15 minutes.

-- -------------------------------------------------------------------------
-- 5. JOURNALISATION — étendre le trigger de log générique aux tables Phase 2
-- -------------------------------------------------------------------------
do $$
declare
  t text;
  tables_a_logger text[] := array['itsm_tickets','itsm_ticket_commentaires','itsm_categories_services'];
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
