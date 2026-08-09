// DSI 360 — Registre des modules (pilote la sidebar + le routing) — Phase 1
import { ROLES } from './lib/roles'

/**
 * Chaque module déclare :
 *  - key        : identifiant unique
 *  - label      : libellé affiché dans le menu
 *  - path       : route racine du module
 *  - icon       : nom d'icône (react-icons)
 *  - roles      : rôles autorisés à voir/utiliser le module
 *  - phase      : phase du plan de développement (traçabilité)
 *  - actif      : permet d'activer/désactiver un module par déploiement
 */
export const MODULES = [
  {
    key: 'dashboard',
    label: 'Tableau de bord',
    path: '/dashboard',
    icon: 'FaChartPie',
    roles: null, // tous les rôles connectés
    phase: 0,
    actif: true,
  },
  {
    key: 'parcit',
    label: 'Parc informatique (ParcIT)',
    path: '/parcit',
    icon: 'FaLaptop',
    roles: [ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN, ROLES.RSSI],
    phase: 1,
    actif: true,
  },
  {
    key: 'helpdesk',
    label: 'Helpdesk ITSM',
    path: '/helpdesk',
    icon: 'FaHeadset',
    roles: [ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN],
    phase: 2,
    actif: true, // ✅ activé — Phase 2 livrée
  },
  {
    key: 'audit-securite',
    label: 'Cybersécurité & Audit SI',
    path: '/audit-securite',
    icon: 'FaShieldAlt',
    roles: [ROLES.DSI, ROLES.RSSI, ROLES.CONTROLEUR_INTERNE],
    phase: 3,
    actif: true, // ✅ activé — Phase 3 livrée
  },
  {
    key: 'data-privacy',
    label: 'Data Privacy / Conformité',
    path: '/data-privacy',
    icon: 'FaUserShield',
    roles: [ROLES.DSI, ROLES.DPO, ROLES.CONTROLEUR_INTERNE],
    phase: 4,
    actif: true, // ✅ activé — Phase 4 livrée
  },
  {
    key: 'gouvernance',
    label: 'Gouvernance IT & PMO',
    path: '/gouvernance',
    icon: 'FaLandmark',
    roles: [ROLES.DSI, ROLES.SUPER_ADMIN],
    phase: 5,
    actif: true, // ✅ activé — Phase 5 livrée
  },
  {
    key: 'administration',
    label: 'Administration',
    path: '/admin/utilisateurs',
    icon: 'FaCogs',
    roles: [ROLES.DSI, ROLES.SUPER_ADMIN],
    phase: 1,
    actif: true,
  },
]

export function modulesVisibles(role) {
  return MODULES.filter(
    (m) => m.actif && (!m.roles || m.roles.includes(role) || role === ROLES.SUPER_ADMIN)
  )
}
