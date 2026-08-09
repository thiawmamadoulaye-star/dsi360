-- =========================================================================
-- DSI 360 — Phase 3 — Cybersécurité & Audit SI
-- Intégration de la Grille d'Audit Sécurité SI (8 domaines, 37 points) et
-- de la Grille Organisationnelle (9 catégories ISO/IEC 27002:2022, 41 points)
-- d'AL_AMANA_TECH_SECURITE, sous forme de gabarits réutilisables pour
-- chaque nouvelle mission (équivalent numérique de "dupliquer le fichier
-- Excel pour chaque mission").
-- =========================================================================

-- -------------------------------------------------------------------------
-- 1. GABARIT DE POINTS DE CONTRÔLE (commun à tous les tenants — référentiel
--    méthodologique du Cabinet, non dupliqué par tenant)
-- -------------------------------------------------------------------------
create table if not exists audit_points_controle_template (
  id uuid primary key default uuid_generate_v4(),
  volet text not null check (volet in ('technique','organisationnel')),
  numero integer not null,
  domaine text not null,
  point_controle text not null,
  element_a_verifier text,
  ordre integer not null
);
create unique index if not exists idx_template_volet_numero on audit_points_controle_template(volet, numero);

truncate table audit_points_controle_template;

-- === VOLET TECHNIQUE — Grille d'Audit Sécurité SI (8 domaines, 37 points) ===
insert into audit_points_controle_template (volet, numero, domaine, point_controle, element_a_verifier, ordre) values
('technique', 1, '1. Sécurité physique', 'Contrôle d''accès aux locaux', 'Badges, clés, système biométrique ; registre des accès ; gestion des visiteurs', 1),
('technique', 2, '1. Sécurité physique', 'Sécurisation de la salle serveurs / data center', 'Accès restreint, climatisation, détection incendie, onduleurs (UPS)', 2),
('technique', 3, '1. Sécurité physique', 'Protection contre les sinistres', 'Extincteurs, détecteurs de fumée, plan d''évacuation, assurance', 3),
('technique', 4, '1. Sécurité physique', 'Gestion des équipements en fin de vie', 'Procédure d''effacement sécurisé des données avant mise au rebut', 4),
('technique', 5, '2. Sécurité logique et gestion des accès', 'Gestion des comptes utilisateurs', 'Procédure de création/modification/suppression, revue périodique des droits', 5),
('technique', 6, '2. Sécurité logique et gestion des accès', 'Politique de mots de passe', 'Complexité exigée, durée de validité, historique, verrouillage après tentatives échouées', 6),
('technique', 7, '2. Sécurité logique et gestion des accès', 'Authentification renforcée', 'Authentification multi-facteurs (MFA) sur les accès sensibles et à distance', 7),
('technique', 8, '2. Sécurité logique et gestion des accès', 'Principe du moindre privilège', 'Séparation des rôles, comptes administrateurs distincts des comptes courants', 8),
('technique', 9, '2. Sécurité logique et gestion des accès', 'Gestion des comptes à privilèges', 'Traçabilité des actions des administrateurs, comptes génériques évités', 9),
('technique', 10, '2. Sécurité logique et gestion des accès', 'Accès distants (VPN, télétravail)', 'Chiffrement des connexions, contrôle des équipements personnels (BYOD)', 10),
('technique', 11, '3. Sécurité réseau et infrastructure', 'Pare-feu et segmentation réseau', 'Existence, règles à jour, séparation des réseaux invités/internes', 11),
('technique', 12, '3. Sécurité réseau et infrastructure', 'Antivirus / anti-malware', 'Déploiement sur tous les postes et serveurs, mises à jour automatiques', 12),
('technique', 13, '3. Sécurité réseau et infrastructure', 'Gestion des mises à jour (patch management)', 'Politique de mise à jour des systèmes d''exploitation et applications', 13),
('technique', 14, '3. Sécurité réseau et infrastructure', 'Wi-Fi et réseaux sans fil', 'Chiffrement WPA2/WPA3, séparation réseau invité, mots de passe par défaut changés', 14),
('technique', 15, '3. Sécurité réseau et infrastructure', 'Sécurité du cloud (M365, Google Workspace...)', 'Configuration MFA, partage externe contrôlé, journalisation activée', 15),
('technique', 16, '4. Sauvegardes et restauration', 'Politique de sauvegarde', 'Fréquence, périmètre couvert (serveurs, postes, messagerie), rétention', 16),
('technique', 17, '4. Sauvegardes et restauration', 'Sauvegardes hors site / cloud', 'Copie de sauvegarde stockée physiquement à distance ou dans le cloud', 17),
('technique', 18, '4. Sauvegardes et restauration', 'Tests de restauration', 'Fréquence des tests réels de restauration (souvent négligés)', 18),
('technique', 19, '4. Sauvegardes et restauration', 'Protection contre les ransomwares', 'Sauvegardes immuables ou déconnectées (air-gapped)', 19),
('technique', 20, '5. Continuité d''activité et gestion de crise', 'Plan de Continuité d''Activité (PCA)', 'Existence, dernière mise à jour, couverture des processus critiques', 20),
('technique', 21, '5. Continuité d''activité et gestion de crise', 'Plan de Reprise d''Activité (PRA)', 'Objectifs de délai de reprise (RTO) et de perte de données (RPO) définis', 21),
('technique', 22, '5. Continuité d''activité et gestion de crise', 'Tests de bascule / exercices de crise', 'Fréquence des exercices réels menés dans l''année', 22),
('technique', 23, '5. Continuité d''activité et gestion de crise', 'Redondance des infrastructures critiques', 'Alimentation électrique, connectivité internet, serveurs de secours', 23),
('technique', 24, '6. Politiques, procédures et conformité', 'Politique de sécurité des SI (PSSI)', 'Existence d''un document formalisé, validé par la direction, diffusé', 24),
('technique', 25, '6. Politiques, procédures et conformité', 'Charte informatique / charte utilisateur', 'Existence, signature par les collaborateurs, sanctions prévues', 25),
('technique', 26, '6. Politiques, procédures et conformité', 'Procédure de gestion des incidents', 'Processus formalisé de déclaration, qualification et traitement', 26),
('technique', 27, '6. Politiques, procédures et conformité', 'Conformité à la loi n° 2008-12 (Sénégal)', 'Registre des traitements, information des personnes, mesures de sécurité', 27),
('technique', 28, '6. Politiques, procédures et conformité', 'Contrats prestataires et clauses de sécurité', 'Clauses de confidentialité et sécurité dans les contrats externes', 28),
('technique', 29, '7. Gouvernance IT', 'Organisation de la fonction IT', 'Existence d''un responsable IT identifié, rattachement hiérarchique', 29),
('technique', 30, '7. Gouvernance IT', 'Pilotage et reporting', 'Tableaux de bord IT, indicateurs suivis, remontée à la direction générale', 30),
('technique', 31, '7. Gouvernance IT', 'Gestion des actifs informatiques', 'Inventaire à jour du parc (matériel, logiciels, licences)', 31),
('technique', 32, '7. Gouvernance IT', 'Gestion des prestataires externes', 'Cartographie des prestataires IT, évaluation de leur sécurité (KYS)', 32),
('technique', 33, '7. Gouvernance IT', 'Budget et ressources IT', 'Adéquation entre moyens alloués et besoins de sécurité identifiés', 33),
('technique', 34, '8. Sensibilisation et facteur humain', 'Programme de sensibilisation', 'Formations régulières sur les risques cyber (phishing, ingénierie sociale)', 34),
('technique', 35, '8. Sensibilisation et facteur humain', 'Processus d''intégration/sortie des collaborateurs', 'Procédure de remise/récupération des accès (arrivées/départs)', 35),
('technique', 36, '8. Sensibilisation et facteur humain', 'Culture de signalement', 'Existence d''un canal simple pour signaler un incident ou comportement suspect', 36),
('technique', 37, '8. Sensibilisation et facteur humain', 'Simulations de phishing', 'Tests d''hameçonnage simulés réalisés auprès des collaborateurs', 37);

-- === VOLET ORGANISATIONNEL — Grille Organisationnelle ISO/IEC 27002:2022 (9 catégories, 41 points) ===
insert into audit_points_controle_template (volet, numero, domaine, point_controle, element_a_verifier, ordre) values
('organisationnel', 1, 'A. Politique et gouvernance de la sécurité', 'Politique de sécurité de l''information formalisée', 'Existence d''un document PSSI approuvé par la Direction', 1),
('organisationnel', 2, 'A. Politique et gouvernance de la sécurité', 'Diffusion et communication de la politique', 'La politique est-elle connue des collaborateurs concernés ?', 2),
('organisationnel', 3, 'A. Politique et gouvernance de la sécurité', 'Révision périodique de la politique', 'Fréquence de mise à jour et de revue de la politique', 3),
('organisationnel', 4, 'A. Politique et gouvernance de la sécurité', 'Engagement visible de la Direction', 'La Direction porte-t-elle visiblement le sujet sécurité ?', 4),
('organisationnel', 5, 'B. Organisation interne et responsabilités', 'Désignation d''un responsable sécurité', 'Existence d''un rôle clairement identifié (RSSI, référent sécurité, ou équivalent)', 5),
('organisationnel', 6, 'B. Organisation interne et responsabilités', 'Séparation des tâches sensibles', 'Les fonctions à risque (ex. validation de virements) sont-elles séparées ?', 6),
('organisationnel', 7, 'B. Organisation interne et responsabilités', 'Contacts avec les autorités compétentes', 'L''organisation sait-elle qui contacter en cas d''incident majeur (CDP, CERT, police) ?', 7),
('organisationnel', 8, 'B. Organisation interne et responsabilités', 'Contacts avec des groupes d''intérêt spécialisés', 'Veille sur les menaces via des réseaux professionnels ou CERT', 8),
('organisationnel', 9, 'B. Organisation interne et responsabilités', 'Sécurité de l''information dans la gestion de projet', 'Prise en compte de la sécurité dès la conception de nouveaux projets IT', 9),
('organisationnel', 10, 'C. Cycle de vie des collaborateurs (RH)', 'Vérification préalable à l''embauche', 'Vérifications réalisées avant l''embauche pour les postes sensibles', 10),
('organisationnel', 11, 'C. Cycle de vie des collaborateurs (RH)', 'Clauses de sécurité dans les contrats de travail', 'Présence de clauses de confidentialité et d''usage des systèmes', 11),
('organisationnel', 12, 'C. Cycle de vie des collaborateurs (RH)', 'Sensibilisation à l''arrivée (onboarding)', 'Les nouveaux arrivants reçoivent-ils une sensibilisation sécurité ?', 12),
('organisationnel', 13, 'C. Cycle de vie des collaborateurs (RH)', 'Procédure disciplinaire en cas de manquement', 'Existence de sanctions prévues en cas de non-respect des règles de sécurité', 13),
('organisationnel', 14, 'C. Cycle de vie des collaborateurs (RH)', 'Procédure de fin de contrat / départ', 'Checklist de départ couvrant la révocation des accès', 14),
('organisationnel', 15, 'D. Gestion des actifs informationnels', 'Inventaire des actifs informationnels', 'Inventaire à jour du matériel, logiciels et données critiques', 15),
('organisationnel', 16, 'D. Gestion des actifs informationnels', 'Classification de l''information', 'Les données sont-elles classifiées selon leur sensibilité ?', 16),
('organisationnel', 17, 'D. Gestion des actifs informationnels', 'Marquage et étiquetage des informations sensibles', 'Les documents sensibles sont-ils identifiés comme tels ?', 17),
('organisationnel', 18, 'D. Gestion des actifs informationnels', 'Gestion des supports amovibles', 'Politique d''usage des clés USB et disques externes', 18),
('organisationnel', 19, 'D. Gestion des actifs informationnels', 'Restitution des actifs en fin de contrat', 'Les équipements sont-ils systématiquement restitués et vérifiés au départ ?', 19),
('organisationnel', 20, 'E. Relations avec les fournisseurs et prestataires', 'Cartographie des prestataires ayant accès au SI', 'Liste des prestataires externes et de leur périmètre d''accès', 20),
('organisationnel', 21, 'E. Relations avec les fournisseurs et prestataires', 'Clauses de sécurité dans les contrats fournisseurs', 'Présence de clauses de sécurité et de confidentialité', 21),
('organisationnel', 22, 'E. Relations avec les fournisseurs et prestataires', 'Évaluation du niveau de sécurité des prestataires (KYS)', 'Un processus d''évaluation des tiers est-il en place ?', 22),
('organisationnel', 23, 'E. Relations avec les fournisseurs et prestataires', 'Suivi et revue des prestations externalisées', 'Existence d''un point de suivi régulier avec les prestataires', 23),
('organisationnel', 24, 'F. Gestion des incidents de sécurité', 'Procédure de signalement des incidents', 'Existence d''un canal simple et connu pour signaler un incident', 24),
('organisationnel', 25, 'F. Gestion des incidents de sécurité', 'Processus de qualification et traitement des incidents', 'Les incidents sont-ils qualifiés selon leur gravité et traités en conséquence ?', 25),
('organisationnel', 26, 'F. Gestion des incidents de sécurité', 'Registre des incidents de sécurité', 'Un registre centralisé des incidents passés est-il tenu ?', 26),
('organisationnel', 27, 'F. Gestion des incidents de sécurité', 'Retour d''expérience post-incident', 'Les incidents font-ils l''objet d''une analyse et d''actions correctives documentées ?', 27),
('organisationnel', 28, 'G. Continuité d''activité', 'Analyse d''impact sur l''activité (BIA)', 'Une analyse identifiant les processus critiques et leur tolérance à la panne a-t-elle été menée ?', 28),
('organisationnel', 29, 'G. Continuité d''activité', 'Plan de Continuité d''Activité (PCA)', 'Existence d''un PCA formalisé et à jour', 29),
('organisationnel', 30, 'G. Continuité d''activité', 'Plan de Reprise d''Activité (PRA) technique', 'Objectifs de délai de reprise (RTO) et de perte de données (RPO) définis', 30),
('organisationnel', 31, 'G. Continuité d''activité', 'Tests et exercices de continuité', 'Fréquence des exercices réels de bascule ou de simulation de crise', 31),
('organisationnel', 32, 'G. Continuité d''activité', 'Redondance des ressources critiques', 'Alimentation électrique, connectivité, sauvegardes de secours', 32),
('organisationnel', 33, 'H. Conformité légale, réglementaire et contractuelle', 'Registre des traitements de données personnelles', 'Un registre conforme à la loi n° 2008-12 est-il tenu ?', 33),
('organisationnel', 34, 'H. Conformité légale, réglementaire et contractuelle', 'Information des personnes concernées', 'Les clients/employés sont-ils informés de l''usage de leurs données ?', 34),
('organisationnel', 35, 'H. Conformité légale, réglementaire et contractuelle', 'Déclaration ou autorisation auprès de la CDP', 'Les traitements nécessitant une formalité CDP ont-ils été déclarés ?', 35),
('organisationnel', 36, 'H. Conformité légale, réglementaire et contractuelle', 'Conformité aux obligations sectorielles', 'Obligations spécifiques au secteur d''activité (ex. droit commercial, fiscal)', 36),
('organisationnel', 37, 'H. Conformité légale, réglementaire et contractuelle', 'Conservation et archivage légal des documents', 'Les durées légales de conservation sont-elles respectées ?', 37),
('organisationnel', 38, 'I. Amélioration continue et pilotage', 'Indicateurs de suivi de la sécurité', 'Des indicateurs (KPI) de sécurité sont-ils suivis par la Direction ?', 38),
('organisationnel', 39, 'I. Amélioration continue et pilotage', 'Audits ou contrôles internes réguliers', 'Des contrôles internes périodiques sont-ils réalisés sur la sécurité ?', 39),
('organisationnel', 40, 'I. Amélioration continue et pilotage', 'Suivi de la mise en œuvre des plans d''action', 'Existe-t-il un mécanisme de suivi des recommandations issues d''audits ou d''incidents ?', 40),
('organisationnel', 41, 'I. Amélioration continue et pilotage', 'Budget dédié à l''amélioration de la sécurité', 'Une enveloppe budgétaire est-elle allouée à la mise en œuvre des recommandations ?', 41);

-- -------------------------------------------------------------------------
-- 2. Lier audit_points_controle au gabarit + à un ordre d'affichage stable
-- -------------------------------------------------------------------------
alter table audit_points_controle
  add column if not exists template_id uuid references audit_points_controle_template(id),
  add column if not exists ordre integer;

-- -------------------------------------------------------------------------
-- 3. FONCTION : créer une nouvelle mission et dupliquer automatiquement
--    les 78 points de contrôle (37 technique + 41 organisationnel) —
--    équivalent numérique de la duplication du fichier Excel gabarit.
-- -------------------------------------------------------------------------
create or replace function fn_creer_mission_audit(
  p_client_nom text,
  p_reference_lettre_mission text default null,
  p_date_debut date default current_date,
  p_date_fin date default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mission_id uuid;
  v_tenant_id uuid := current_tenant_id();
begin
  insert into audit_missions (tenant_id, client_nom, reference_lettre_mission, date_debut, date_fin, statut)
  values (v_tenant_id, p_client_nom, p_reference_lettre_mission, p_date_debut, p_date_fin, 'cadrage')
  returning id into v_mission_id;

  insert into audit_points_controle (
    tenant_id, mission_id, volet, domaine, point_controle, element_a_verifier,
    template_id, ordre, statut
  )
  select
    v_tenant_id, v_mission_id, t.volet, t.domaine, t.point_controle, t.element_a_verifier,
    t.id, t.ordre, 'a_traiter'
  from audit_points_controle_template t
  order by t.volet, t.ordre;

  return v_mission_id;
end;
$$;

-- -------------------------------------------------------------------------
-- 4. VUES DE SYNTHÈSE — maturité moyenne par domaine + répartition des
--    risques, équivalent de l'onglet « Synthèse » du fichier Excel.
-- -------------------------------------------------------------------------
create or replace view vw_audit_synthese_domaine as
select
  p.mission_id,
  p.volet,
  p.domaine,
  round(avg(p.maturite)::numeric, 2) as maturite_moyenne,
  count(*) as nb_points,
  count(*) filter (where p.maturite is null) as nb_non_evalues
from audit_points_controle p
group by p.mission_id, p.volet, p.domaine;

create or replace view vw_audit_synthese_globale as
select
  p.mission_id,
  round(avg(p.maturite)::numeric, 2) as maturite_globale,
  count(*) as nb_points_total,
  count(*) filter (where p.niveau_risque = 'critique') as nb_critique,
  count(*) filter (where p.niveau_risque = 'eleve') as nb_eleve,
  count(*) filter (where p.niveau_risque = 'modere') as nb_modere,
  count(*) filter (where p.niveau_risque = 'faible') as nb_faible
from audit_points_controle p
group by p.mission_id;

comment on view vw_audit_synthese_domaine is
  'Maturité moyenne par domaine/catégorie pour une mission — équivalent onglet Synthèse.';
comment on view vw_audit_synthese_globale is
  'Maturité globale et répartition des niveaux de risque pour une mission.';

-- -------------------------------------------------------------------------
-- 5. Journalisation étendue aux tables Phase 3
-- -------------------------------------------------------------------------
do $$
declare
  t text;
  tables_a_logger text[] := array['audit_missions','audit_points_controle','cyber_risques','cyber_vulnerabilites'];
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

-- Le gabarit (référentiel méthodologique) est en lecture seule pour tous les
-- tenants authentifiés ; sa modification est réservée au super_admin (Cabinet).
alter table audit_points_controle_template enable row level security;
create policy template_select_all on audit_points_controle_template
  for select using (true);
create policy template_write_super_admin on audit_points_controle_template
  for all using (is_super_admin()) with check (is_super_admin());
