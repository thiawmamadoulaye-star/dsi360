// DSI 360 — Constantes de rôles et permissions (Phase 1 — socle d'authentification)

export const ROLES = {
  SUPER_ADMIN: 'super_admin',
  DSI: 'dsi',
  RSSI: 'rssi',
  DPO: 'dpo',
  IT_MANAGER: 'it_manager',
  TECHNICIEN: 'technicien',
  CONTROLEUR_INTERNE: 'controleur_interne',
  DG: 'dg',
}

export const ROLE_LABELS = {
  [ROLES.SUPER_ADMIN]: 'Super Administrateur',
  [ROLES.DSI]: 'DSI',
  [ROLES.RSSI]: 'RSSI',
  [ROLES.DPO]: 'DPO',
  [ROLES.IT_MANAGER]: 'IT Manager',
  [ROLES.TECHNICIEN]: 'Technicien',
  [ROLES.CONTROLEUR_INTERNE]: 'Contrôleur interne',
  [ROLES.DG]: 'Directeur Général',
}

// Rôles autorisés à voir le lien "Paramètres" dans le portail (masqué au Technicien)
export const ROLES_PARAMETRES = [
  ROLES.SUPER_ADMIN,
  ROLES.DSI,
  ROLES.IT_MANAGER,
  ROLES.RSSI,
  ROLES.DPO,
]

// Rôles autorisés à voir le lien "Administration" (utilisateurs, logs, corbeille)
export const ROLES_ADMINISTRATION = [ROLES.SUPER_ADMIN, ROLES.DSI]

// Rôle limité à la lecture du dashboard exécutif uniquement
export const ROLE_DASHBOARD_SEUL = ROLES.DG

/**
 * Vérifie si un rôle donné fait partie d'une liste de rôles autorisés.
 * @param {string} role
 * @param {string[]} rolesAutorises
 */
export function roleAutorise(role, rolesAutorises = []) {
  if (!role) return false
  if (role === ROLES.SUPER_ADMIN) return true // super_admin passe partout
  return rolesAutorises.includes(role)
}

/**
 * Retourne true si l'utilisateur a le droit d'ajouter/modifier/supprimer
 * sur les modules opérationnels (ParcIT, Helpdesk...).
 */
export function peutEditerDonneesOperationnelles(role) {
  return roleAutorise(role, [
    ROLES.SUPER_ADMIN,
    ROLES.DSI,
    ROLES.IT_MANAGER,
    ROLES.TECHNICIEN,
  ])
}
