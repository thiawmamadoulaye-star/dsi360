// DSI 360 — Helpdesk : configuration des colonnes affichables (paramétrable par tenant)
export const COLONNES_DISPONIBLES_TICKETS = [
  { cle: 'numero', label: 'N°', parDefaut: true },
  { cle: 'titre', label: 'Titre', parDefaut: true },
  { cle: 'type_ticket', label: 'Type', parDefaut: true },
  { cle: 'priorite', label: 'Priorité', parDefaut: true },
  { cle: 'statut', label: 'Statut', parDefaut: true },
  { cle: 'assigne', label: 'Assigné à', parDefaut: true },
  { cle: 'demandeur', label: 'Demandeur', parDefaut: false },
  { cle: 'categorie', label: 'Catégorie', parDefaut: false },
  { cle: 'sla_echeance', label: 'Échéance SLA', parDefaut: true },
  { cle: 'created_at', label: 'Créé le', parDefaut: false },
]

export const CLE_PARAMETRE_COLONNES_TICKETS = 'colonnes_helpdesk'
