-- =========================================================================
-- DSI 360 — AL_AMANA_TECH_SECURITE
-- Phase 0 — Schéma Supabase (PostgreSQL) — SOCLE CENTRAL MULTI-TENANT
-- =========================================================================
-- Choix structurant : MULTI-TENANT PAR COLONNE tenant_id (schéma partagé)
-- plutôt que schémas séparés par client.
-- Justification (voir docs/architecture_projet_react.md § Décision multi-tenant) :
--   - Compatible nativement avec Supabase RLS (une seule base à administrer)
--   - Migrations appliquées une seule fois pour tous les clients
--   - Coût d'infrastructure maîtrisé (indispensable au stade PME/cabinet)
--   - Permet des vues consolidées pour AL_AMANA_TECH_SECURITE (support, facturation)
--   - Isolation garantie par RLS + tenant_id NOT NULL sur toutes les tables
-- =========================================================================

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- -------------------------------------------------------------------------
-- 1. TENANTS (espaces clients isolés)
-- -------------------------------------------------------------------------
create table if not exists tenants (
  id uuid primary key default uuid_generate_v4(),
  nom text not null,
  type_client text not null check (type_client in ('cabinet_conseil','entreprise','institution')),
  plan text not null default 'starter' check (plan in ('starter','pro','entreprise')),
  statut text not null default 'actif' check (statut in ('actif','suspendu','archive')),
  logo_url text,
  couleur_primaire text default '#0d0f21', -- navy
  couleur_secondaire text default '#c9a227', -- or
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- 2. RÔLES applicatifs (enum partagé par tous les modules)
-- -------------------------------------------------------------------------
do $$ begin
  create type app_role as enum (
    'super_admin',        -- administration complète, tous tenants (usage AL_AMANA_TECH_SECURITE)
    'dsi',                -- pilotage global du tenant, accès à tous les modules
    'rssi',               -- cybersécurité & risques
    'dpo',                -- data privacy
    'it_manager',         -- exploitation quotidienne (parc, helpdesk)
    'technicien',         -- ajouter/modifier/supprimer, sans page paramètres
    'controleur_interne', -- lecture logs & audits uniquement
    'dg'                  -- lecture du dashboard exécutif uniquement
  );
exception when duplicate_object then null; end $$;

-- -------------------------------------------------------------------------
-- 3. PROFILES (extension de auth.users, rattaché à un tenant + un rôle)
-- -------------------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom text not null,
  prenom text,
  email text not null,
  role app_role not null default 'technicien',
  poste text, -- intitulé de poste libre (ex: "Administrateur systèmes")
  statut text not null default 'actif' check (statut in ('actif','inactif','suspendu')),
  peut_voir_parametres boolean not null default false, -- masquage explicite page paramètres (Technicien)
  peut_restaurer_suppressions boolean not null default false, -- accordé par défaut aux admins
  derniere_connexion timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_tenant on profiles(tenant_id);
create index if not exists idx_profiles_role on profiles(role);

-- -------------------------------------------------------------------------
-- 4. RÉFÉRENTIEL CMDB CENTRAL — relie tous les modules
-- -------------------------------------------------------------------------
-- 4.1 Équipements (issu de ParcIT)
create table if not exists cmdb_equipements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  code_actif text, -- code d'inventaire interne
  type_equipement text not null, -- PC, Serveur, Switch, Imprimante, Mobile...
  marque text,
  modele text,
  numero_serie text,
  date_acquisition date,
  date_bios date, -- utilisé pour calcul obsolescence
  ram_go numeric,
  os text,
  os_version text,
  localisation text,
  utilisateur_assigne_id uuid references profiles(id),
  fournisseur_id uuid, -- FK vers cmdb_fournisseurs (défini plus bas)
  statut text not null default 'en_service' check (
    statut in ('en_service','en_cours_utilisation','en_stock','en_maintenance','obsolete','reforme','perdu_vole')
  ),
  cout_acquisition numeric,
  colonnes_personnalisees jsonb default '{}'::jsonb, -- flexibilité colonnes paramétrables
  deleted_at timestamptz, -- soft delete -> corbeille
  deleted_by uuid references profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references profiles(id)
);
create index if not exists idx_equipements_tenant on cmdb_equipements(tenant_id);
create index if not exists idx_equipements_statut on cmdb_equipements(statut);

-- 4.2 Applications / logiciels
create table if not exists cmdb_applications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom text not null,
  editeur text,
  version text,
  criticite text check (criticite in ('faible','moyenne','elevee','critique')),
  proprietaire_id uuid references profiles(id),
  licence_type text,
  licence_expiration date,
  nb_licences integer,
  statut text default 'actif',
  deleted_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_applications_tenant on cmdb_applications(tenant_id);

-- 4.3 Fournisseurs & contrats
create table if not exists cmdb_fournisseurs (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom text not null,
  contact_nom text,
  contact_email text,
  contact_tel text,
  type_prestation text,
  created_at timestamptz not null default now()
);

create table if not exists cmdb_contrats (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  fournisseur_id uuid references cmdb_fournisseurs(id),
  objet text not null,
  type_contrat text check (type_contrat in ('maintenance','licence','support','hebergement','autre')),
  date_debut date,
  date_fin date,
  montant numeric,
  devise text default 'FCFA',
  statut text default 'actif' check (statut in ('actif','expire','resilie','en_negociation')),
  document_url text,
  created_at timestamptz not null default now()
);
alter table cmdb_equipements
  add constraint fk_equip_fournisseur foreign key (fournisseur_id) references cmdb_fournisseurs(id);

-- 4.4 Relations génériques entre CI (graphe CMDB)
create table if not exists cmdb_relations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ci_source_type text not null, -- 'equipement' | 'application' | 'contrat'
  ci_source_id uuid not null,
  ci_cible_type text not null,
  ci_cible_id uuid not null,
  type_relation text not null, -- 'depend_de','herberge','connecte_a'...
  created_at timestamptz not null default now()
);

-- 4.5 Paramètres par tenant (colonnes affichées, seuil obsolescence, dashboard)
create table if not exists parametres_tenant (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  cle text not null, -- ex: 'obsolescence_bios_seuil_annees', 'colonnes_parc_it', 'dashboard_layout'
  valeur jsonb not null,
  updated_by uuid references profiles(id),
  updated_at timestamptz not null default now(),
  unique(tenant_id, cle)
);

-- valeur par défaut : seuil obsolescence BIOS = 5 ans (paramétrable par tenant)
comment on table parametres_tenant is
  'Stocke les préférences UI/métier par tenant : colonnes visibles, seuils obsolescence, disposition dashboard, options de statut personnalisées.';

-- -------------------------------------------------------------------------
-- 5. JOURNAL D'AUDIT GLOBAL (transverse à tous les modules)
-- -------------------------------------------------------------------------
create table if not exists logs_audit (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references profiles(id),
  action text not null, -- 'CREATE','UPDATE','DELETE','RESTORE','LOGIN','ROLE_CHANGE'...
  table_cible text not null,
  enregistrement_id uuid,
  ancienne_valeur jsonb,
  nouvelle_valeur jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists idx_logs_tenant on logs_audit(tenant_id);
create index if not exists idx_logs_created on logs_audit(created_at);

-- -------------------------------------------------------------------------
-- 6. NOTIFICATIONS (alertes obsolescence, validations, échéances...)
-- -------------------------------------------------------------------------
create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  user_id uuid references profiles(id),
  type text not null, -- 'obsolescence','validation_pv','ticket_assigne','echeance_conformite'...
  titre text not null,
  message text,
  lien text,
  lu boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notif_user on notifications(user_id, lu);
