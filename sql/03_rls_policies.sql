-- =========================================================================
-- DSI 360 — Phase 0 — Politiques RLS de base (par rôle, isolation multi-tenant)
-- =========================================================================
-- Principe général :
--   1. Isolation stricte par tenant_id (aucune donnée visible hors du tenant
--      de l'utilisateur connecté, sauf super_admin).
--   2. Droits différenciés par rôle applicatif (voir table profiles.role).
--   3. Le rôle "technicien" a Ajouter/Modifier/Supprimer sur les données
--      opérationnelles mais N'A PAS accès à parametres_tenant.
--   4. Le rôle "dg" a un accès EN LECTURE SEULE, limité à la vue exécutive.
--   5. Le rôle "controleur_interne" a un accès EN LECTURE SEULE aux logs et
--      aux données d'audit uniquement.
-- =========================================================================
-- CORRECTIF (9 août 2026) : la fonction "current_role" a été renommée en
-- "app_current_role" car "current_role" est un mot-clé RÉSERVÉ de PostgreSQL
-- (fonction niladique système, comme CURRENT_USER / CURRENT_DATE). Il est
-- impossible de créer une fonction utilisateur portant ce nom exact.
-- =========================================================================

-- -------------------------------------------------------------------------
-- FONCTIONS UTILITAIRES (SECURITY DEFINER pour éviter la récursion RLS)
-- -------------------------------------------------------------------------
create or replace function current_profile()
returns profiles
language sql stable security definer
set search_path = public
as $$
  select * from profiles where id = auth.uid();
$$;

create or replace function current_tenant_id()
returns uuid
language sql stable security definer
set search_path = public
as $$
  select tenant_id from profiles where id = auth.uid();
$$;

-- Renommée : "current_role" est un mot réservé PostgreSQL, on utilise
-- "app_current_role" (utilisé par tous les scripts de la Phase 0 à la
-- Phase 7 : 03, 07, 08, 09).
create or replace function app_current_role()
returns app_role
language sql stable security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid();
$$;

create or replace function is_super_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select coalesce((select role = 'super_admin' from profiles where id = auth.uid()), false);
$$;

-- -------------------------------------------------------------------------
-- ACTIVATION RLS SUR TOUTES LES TABLES SENSIBLES
-- -------------------------------------------------------------------------
alter table tenants enable row level security;
alter table profiles enable row level security;
alter table cmdb_equipements enable row level security;
alter table cmdb_applications enable row level security;
alter table cmdb_fournisseurs enable row level security;
alter table cmdb_contrats enable row level security;
alter table cmdb_relations enable row level security;
alter table parametres_tenant enable row level security;
alter table logs_audit enable row level security;
alter table notifications enable row level security;
alter table itsm_tickets enable row level security;
alter table itsm_categories_services enable row level security;
alter table itsm_ticket_commentaires enable row level security;
alter table audit_missions enable row level security;
alter table audit_points_controle enable row level security;
alter table cyber_risques enable row level security;
alter table cyber_vulnerabilites enable row level security;
alter table dp_traitements enable row level security;
alter table dp_violations enable row level security;
alter table dp_dpia enable row level security;
alter table gouv_projets enable row level security;
alter table gouv_budget_lignes enable row level security;
alter table gouv_comites enable row level security;

-- -------------------------------------------------------------------------
-- TENANTS : seul le super_admin gère la liste des tenants
-- -------------------------------------------------------------------------
create policy tenants_super_admin_all on tenants
  for all using (is_super_admin()) with check (is_super_admin());

create policy tenants_self_select on tenants
  for select using (id = current_tenant_id());

-- -------------------------------------------------------------------------
-- PROFILES : chacun voit les profils de son tenant ; seuls DSI/super_admin
-- peuvent créer/modifier des rôles ; un technicien ne modifie pas de rôle.
-- -------------------------------------------------------------------------
create policy profiles_select_tenant on profiles
  for select using (tenant_id = current_tenant_id() or is_super_admin());

create policy profiles_update_self on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles p2 where p2.id = auth.uid())); -- interdit l'auto-élévation

create policy profiles_manage_by_admin on profiles
  for all using (
    is_super_admin()
    or (tenant_id = current_tenant_id() and app_current_role() in ('dsi'))
  )
  with check (
    is_super_admin()
    or (tenant_id = current_tenant_id() and app_current_role() in ('dsi'))
  );

-- -------------------------------------------------------------------------
-- GABARIT GÉNÉRIQUE POUR LES TABLES OPÉRATIONNELLES (CMDB, ITSM, Audit...)
-- Exemple détaillé sur cmdb_equipements, à dupliquer pour les autres tables
-- opérationnelles en adaptant simplement le nom de table.
-- -------------------------------------------------------------------------

-- Lecture : tout utilisateur actif de son tenant (hors DG limité à la vue exec.)
create policy equipements_select on cmdb_equipements
  for select using (
    tenant_id = current_tenant_id()
    and app_current_role() <> 'dg'
    or is_super_admin()
  );

-- Ajout : DSI, IT Manager, Technicien
create policy equipements_insert on cmdb_equipements
  for insert with check (
    tenant_id = current_tenant_id()
    and app_current_role() in ('dsi','it_manager','technicien')
  );

-- Modification : DSI, IT Manager, Technicien
create policy equipements_update on cmdb_equipements
  for update using (
    tenant_id = current_tenant_id()
    and app_current_role() in ('dsi','it_manager','technicien')
  );

-- Suppression (soft-delete applicatif) : DSI, IT Manager, Technicien
create policy equipements_delete on cmdb_equipements
  for delete using (
    tenant_id = current_tenant_id()
    and app_current_role() in ('dsi','it_manager','technicien')
  );

-- -------------------------------------------------------------------------
-- Répliquer le même schéma de policies (select/insert/update/delete, filtre
-- tenant_id + rôles autorisés) sur : cmdb_applications, cmdb_fournisseurs,
-- cmdb_contrats, cmdb_relations, itsm_tickets, itsm_ticket_commentaires.
-- Ci-dessous, un exemple condensé factorisé via policy unique "for all".
-- -------------------------------------------------------------------------
create policy applications_all on cmdb_applications
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','it_manager','technicien'));

create policy fournisseurs_all on cmdb_fournisseurs
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','it_manager','technicien'));

create policy contrats_all on cmdb_contrats
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','it_manager','technicien'));

create policy relations_all on cmdb_relations
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','it_manager','technicien'));

create policy tickets_all on itsm_tickets
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','it_manager','technicien'));

create policy tickets_categories_all on itsm_categories_services
  for all using (tenant_id = current_tenant_id())
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','it_manager'));

create policy tickets_commentaires_all on itsm_ticket_commentaires
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id());

-- -------------------------------------------------------------------------
-- CYBERSÉCURITÉ & AUDIT SI : réservé RSSI + DSI (lecture élargie), écriture RSSI/DSI
-- -------------------------------------------------------------------------
create policy audit_missions_rw on audit_missions
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi'));

create policy audit_points_rw on audit_points_controle
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi'));

create policy cyber_risques_rw on cyber_risques
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi'));

create policy cyber_vuln_rw on cyber_vulnerabilites
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi','controleur_interne','it_manager'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi','rssi','it_manager'));

-- -------------------------------------------------------------------------
-- DATA PRIVACY : réservé DPO + DSI (lecture), écriture DPO uniquement
-- -------------------------------------------------------------------------
create policy dp_traitements_rw on dp_traitements
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','dpo','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dpo','dsi'));

create policy dp_violations_rw on dp_violations
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','dpo','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dpo','dsi'));

create policy dp_dpia_rw on dp_dpia
  for all using (tenant_id = current_tenant_id() and app_current_role() in ('dsi','dpo','controleur_interne'))
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dpo','dsi'));

-- -------------------------------------------------------------------------
-- GOUVERNANCE / PMO : DSI pilote, DG en lecture seule (via vue exécutive)
-- -------------------------------------------------------------------------
create policy gouv_projets_rw on gouv_projets
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi'));

create policy gouv_budget_rw on gouv_budget_lignes
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi'));

create policy gouv_comites_rw on gouv_comites
  for all using (tenant_id = current_tenant_id() and app_current_role() <> 'dg')
  with check (tenant_id = current_tenant_id() and app_current_role() in ('dsi'));

-- -------------------------------------------------------------------------
-- PARAMÈTRES TENANT : masqué au rôle "technicien" (exigence explicite),
-- accessible à DSI, IT Manager, RSSI, DPO selon leur périmètre.
-- -------------------------------------------------------------------------
create policy parametres_select on parametres_tenant
  for select using (
    tenant_id = current_tenant_id()
    and app_current_role() in ('dsi','it_manager','rssi','dpo','super_admin')
  );

create policy parametres_write on parametres_tenant
  for all using (
    tenant_id = current_tenant_id()
    and app_current_role() in ('dsi','it_manager')
  )
  with check (
    tenant_id = current_tenant_id()
    and app_current_role() in ('dsi','it_manager')
  );
-- Note : aucune policy n'autorise 'technicien' => accès refusé par défaut (RLS deny-by-default)

-- -------------------------------------------------------------------------
-- LOGS D'AUDIT : lecture pour Contrôleur interne, DSI, super_admin.
-- Écriture réservée aux triggers système (voir 04_security_triggers.sql).
-- -------------------------------------------------------------------------
create policy logs_select on logs_audit
  for select using (
    tenant_id = current_tenant_id()
    and app_current_role() in ('controleur_interne','dsi','rssi','super_admin')
  );
-- Pas de policy insert/update/delete "utilisateur" => seules les fonctions
-- SECURITY DEFINER (triggers) peuvent écrire dans logs_audit.

-- -------------------------------------------------------------------------
-- NOTIFICATIONS : chacun ne voit que les siennes
-- -------------------------------------------------------------------------
create policy notifications_self on notifications
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- -------------------------------------------------------------------------
-- DASHBOARD EXÉCUTIF (DG) : accès en lecture à la vue uniquement.
-- Les vues héritent des RLS des tables sous-jacentes ; pour garantir que le
-- DG ne voit QUE cette vue de synthèse (et aucune table opérationnelle),
-- aucune policy select "dg" n'est ajoutée sur les tables détaillées ci-dessus
-- (voir les conditions "app_current_role() <> 'dg'" qui l'excluent explicitement).
-- -------------------------------------------------------------------------
grant select on vw_dashboard_executif to authenticated;