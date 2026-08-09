# DSI 360 — Architecture projet React (Phase 0)
AL_AMANA_TECH_SECURITE · Gouvernance IT · Cybersécurité · Data Privacy

## Décision structurante — Modèle multi-tenant

**Choix retenu : colonne `tenant_id` sur un schéma partagé** (plutôt que des schémas Postgres séparés par client).

| Critère | `tenant_id` (retenu) | Schémas séparés |
|---|---|---|
| Compatibilité Supabase RLS | Native, simple | Complexe (search_path dynamique) |
| Coût opérationnel | 1 base à maintenir | 1 migration × N clients |
| Vue consolidée AL_AMANA_TECH_SECURITE (support/facturation) | Facile (vues cross-tenant pour super_admin) | Nécessite du fan-out applicatif |
| Isolation | Garantie par RLS + `tenant_id NOT NULL` | Garantie par le schéma lui-même |
| Adapté au volume attendu (PME/cabinets) | ✅ Oui | Overkill à ce stade |

➡️ Si un client Grand Compte exige une isolation physique stricte (contractuelle), une bascule vers une base Supabase dédiée pour ce client reste possible sans réécrire l'application (le code applicatif ne change pas, seule la chaîne de connexion change).

## Arborescence du projet React

```
dsi360/
├── public/
│   ├── manifest.json           # PWA (réutilisé du pack ParcIT/AFFIC)
│   ├── sw.js
│   └── icons/
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js    # client Supabase + helpers de rôle
│   │   └── roles.js             # constantes de rôles + libellés + permissions
│   ├── contexts/
│   │   └── AuthContext.jsx      # session, profil, tenant, rôle courant
│   ├── components/
│   │   ├── ProtectedRoute.jsx   # garde de route par rôle
│   │   ├── Badges.jsx           # badges de statut réutilisables
│   │   └── ui/                  # boutons, tables paramétrables, modales
│   ├── layouts/
│   │   └── PortalLayout.jsx     # portail unique : sidebar multi-modules + topbar
│   ├── pages/
│   │   ├── Login.jsx
│   │   ├── Dashboard.jsx        # dashboard exécutif (rôle DG) ou opérationnel
│   │   ├── parcit/               # Module 1 : ParcIT (migré tel quel)
│   │   │   ├── Equipements.jsx
│   │   │   ├── Fournisseurs.jsx
│   │   │   └── Parametres.jsx
│   │   ├── helpdesk/             # Module 2 (Phase 2)
│   │   ├── audit-securite/       # Module 3 (Phase 3) — Grille Audit SI
│   │   ├── data-privacy/         # Module 4 (Phase 4)
│   │   ├── gouvernance/          # Module 5 (Phase 5) — lié à AFFIC Gestion CA
│   │   └── admin/
│   │       ├── Utilisateurs.jsx
│   │       ├── Logs.jsx          # Contrôleur interne + DSI
│   │       └── Corbeille.jsx     # restauration suppressions
│   ├── modules.config.js         # registre des modules actifs par tenant/plan
│   ├── App.jsx                   # routeur racine
│   └── main.jsx
├── supabase/
│   ├── functions/                # Edge Functions (emails, alertes obsolescence)
│   └── migrations/                # 01_schema_core.sql, 02_schema_modules.sql...
├── tailwind.config.js             # charte navy/or déjà validée
└── package.json
```

## Principes de l'architecture multi-module

1. **`modules.config.js`** définit la liste des modules (ParcIT, Helpdesk, Audit
   Sécurité, Data Privacy, Gouvernance) avec, pour chacun, la route, l'icône,
   et les rôles autorisés à le voir dans le menu. Le `PortalLayout` construit
   dynamiquement la sidebar à partir de cette config et du rôle de
   `AuthContext`, permettant d'activer/désactiver des modules par tenant/plan
   sans toucher au routing.
2. **Un seul point d'authentification** (`AuthContext`) partagé par tous les
   modules : la session Supabase et le profil (tenant_id, rôle) sont chargés
   une fois puis exposés via `useAuth()`.
3. **Garde de route générique** (`ProtectedRoute`) : `<ProtectedRoute roles={['dsi','it_manager']}>`
   encapsule chaque page/route et redirige vers `/login` ou une page 403.
4. **Composants de table paramétrable** réutilisés entre modules (ParcIT
   l'utilise déjà pour les colonnes configurables) : un seul composant
   `DataTable` générique piloté par `parametres_tenant`.
5. **Chaque module reste un dossier autonome** sous `src/pages/<module>/`,
   ce qui permet de livrer/activer les modules phase par phase sans
   dépendances croisées fortes.

## Prochaine étape (Phase 1)

Le code du socle d'authentification multi-rôles, du portail de navigation et
de la migration de ParcIT dans ce socle est fourni dans `src/` de ce pack.
