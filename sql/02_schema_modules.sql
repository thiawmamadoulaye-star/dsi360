-- =========================================================================
-- DSI 360 — Phase 0 — Schémas des modules métier (Phases 2 à 5)
-- Tous rattachés au référentiel CMDB central (tenant_id + FK vers CI)
-- =========================================================================

-- -------------------------------------------------------------------------
-- MODULE HELPDESK / ITSM (Phase 2)
-- -------------------------------------------------------------------------
create table if not exists itsm_categories_services (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom text not null,
  sla_heures integer default 24,
  created_at timestamptz not null default now()
);

create table if not exists itsm_tickets (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  numero text not null, -- ex: TCK-2026-0001
  type_ticket text not null check (type_ticket in ('incident','demande','probleme')),
  categorie_id uuid references itsm_categories_services(id),
  titre text not null,
  description text,
  priorite text not null default 'normale' check (priorite in ('basse','normale','haute','critique')),
  statut text not null default 'ouvert' check (statut in ('ouvert','en_cours','en_attente','resolu','ferme','escalade')),
  equipement_id uuid references cmdb_equipements(id),
  demandeur_id uuid references profiles(id),
  assigne_a uuid references profiles(id),
  sla_echeance timestamptz,
  date_resolution timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_tickets_tenant on itsm_tickets(tenant_id);
create index if not exists idx_tickets_statut on itsm_tickets(statut);

create table if not exists itsm_ticket_commentaires (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ticket_id uuid not null references itsm_tickets(id) on delete cascade,
  auteur_id uuid references profiles(id),
  message text not null,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- MODULE CYBERSÉCURITÉ & AUDIT SI (Phase 3)
-- Reprend la Grille d'Audit Sécurité SI & Grille Organisationnelle existantes
-- -------------------------------------------------------------------------
create table if not exists audit_missions (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  client_nom text not null,
  reference_lettre_mission text,
  date_debut date,
  date_fin date,
  statut text default 'en_cours' check (statut in ('cadrage','en_cours','synthese','cloture')),
  maturite_globale numeric,
  created_at timestamptz not null default now()
);

create table if not exists audit_points_controle (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  mission_id uuid not null references audit_missions(id) on delete cascade,
  volet text not null check (volet in ('technique','organisationnel')),
  domaine text not null, -- ex: '1. Sécurité physique', 'A. Politique et gouvernance'...
  point_controle text not null,
  element_a_verifier text,
  maturite integer check (maturite between 0 and 5),
  constat text,
  preuve_document text,
  niveau_risque text check (niveau_risque in ('faible','modere','eleve','critique')),
  recommandation text,
  responsable_suggere text,
  delai_suggere text,
  statut text default 'a_traiter' check (statut in ('a_traiter','en_cours','traite','accepte_risque')),
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_points_mission on audit_points_controle(mission_id);

create table if not exists cyber_risques (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  ci_lie_id uuid, -- référence libre vers cmdb_equipements / applications
  ci_lie_type text,
  risque text not null,
  probabilite integer check (probabilite between 1 and 5),
  impact integer check (impact between 1 and 5),
  niveau text generated always as (
    case when probabilite*impact >= 16 then 'critique'
         when probabilite*impact >= 9 then 'eleve'
         when probabilite*impact >= 4 then 'modere'
         else 'faible' end
  ) stored,
  plan_remediation text,
  responsable_id uuid references profiles(id),
  echeance date,
  statut text default 'ouvert' check (statut in ('ouvert','en_traitement','clos','accepte')),
  created_at timestamptz not null default now()
);

create table if not exists cyber_vulnerabilites (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  equipement_id uuid references cmdb_equipements(id),
  description text not null,
  cve_reference text,
  criticite text check (criticite in ('faible','moyenne','elevee','critique')),
  statut text default 'ouverte' check (statut in ('ouverte','en_remediation','corrigee','risque_accepte')),
  date_detection date default current_date,
  date_remediation date,
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- MODULE DATA PRIVACY / CONFORMITÉ (Phase 4) — CDP Sénégal / RGPD
-- -------------------------------------------------------------------------
create table if not exists dp_traitements (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom_traitement text not null,
  finalite text not null,
  base_legale text,
  categories_donnees text[],
  categories_personnes text[],
  duree_conservation text,
  responsable_traitement text,
  sous_traitants text,
  mesures_securite text,
  transferts_hors_pays boolean default false,
  statut text default 'actif' check (statut in ('actif','en_revision','archive')),
  created_at timestamptz not null default now()
);

create table if not exists dp_violations (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  date_incident timestamptz not null,
  description text not null,
  donnees_concernees text,
  nb_personnes_impactees integer,
  notifie_cdp boolean default false,
  date_notification_cdp date,
  mesures_prises text,
  statut text default 'ouverte' check (statut in ('ouverte','en_investigation','cloturee')),
  created_at timestamptz not null default now()
);

create table if not exists dp_dpia (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  traitement_id uuid references dp_traitements(id),
  date_evaluation date default current_date,
  niveau_risque text check (niveau_risque in ('faible','modere','eleve')),
  mesures_attenuation text,
  statut text default 'en_cours' check (statut in ('en_cours','validee','a_revoir')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- MODULE GOUVERNANCE IT & PMO (Phase 5)
-- -------------------------------------------------------------------------
create table if not exists gouv_projets (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  nom text not null,
  description text,
  chef_projet_id uuid references profiles(id),
  budget_capex numeric default 0,
  budget_opex numeric default 0,
  cout_reel numeric default 0,
  date_debut date,
  echeance date,
  statut text default 'planifie' check (statut in ('planifie','en_cours','en_retard','termine','abandonne')),
  created_at timestamptz not null default now()
);

create table if not exists gouv_budget_lignes (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  projet_id uuid references gouv_projets(id),
  categorie text, -- 'capex' | 'opex'
  libelle text,
  montant_prevu numeric,
  montant_reel numeric,
  periode text, -- ex '2026-Q3'
  created_at timestamptz not null default now()
);

-- Comités IT / COPIL — s'articule avec le module AFFIC (Gestion CA) existant
-- via un lien logique optionnel vers un id de conseil AFFIC (systeme externe/lié)
create table if not exists gouv_comites (
  id uuid primary key default uuid_generate_v4(),
  tenant_id uuid not null references tenants(id) on delete cascade,
  type_comite text check (type_comite in ('comite_it','copil','conseil_administration')),
  affic_conseil_id uuid, -- référence optionnelle vers table externe 'conseils' d'AFFIC
  date_reunion date,
  titre text,
  compte_rendu text,
  decisions text,
  statut text default 'planifie' check (statut in ('planifie','tenu','compte_rendu_valide')),
  created_at timestamptz not null default now()
);

-- -------------------------------------------------------------------------
-- VUE CONSOLIDÉE — DASHBOARD EXÉCUTIF (DG / Conseil d'Administration)
-- -------------------------------------------------------------------------
create or replace view vw_dashboard_executif as
select
  t.id as tenant_id,
  t.nom as tenant_nom,
  (select count(*) from cmdb_equipements e where e.tenant_id = t.id and e.deleted_at is null) as nb_equipements,
  (select count(*) from cmdb_equipements e where e.tenant_id = t.id and e.statut = 'obsolete' and e.deleted_at is null) as nb_equipements_obsoletes,
  (select count(*) from itsm_tickets tk where tk.tenant_id = t.id and tk.statut not in ('resolu','ferme')) as tickets_ouverts,
  (select count(*) from cyber_risques r where r.tenant_id = t.id and r.statut = 'ouvert' and r.niveau in ('eleve','critique')) as risques_critiques_ouverts,
  (select count(*) from dp_violations v where v.tenant_id = t.id and v.statut <> 'cloturee') as violations_donnees_ouvertes,
  (select coalesce(sum(budget_capex + budget_opex),0) from gouv_projets p where p.tenant_id = t.id and p.statut = 'en_cours') as budget_projets_en_cours
from tenants t;

comment on view vw_dashboard_executif is
  'Vue en lecture seule exposée au rôle DG : synthèse exécutive tous modules, sans détail opérationnel.';
