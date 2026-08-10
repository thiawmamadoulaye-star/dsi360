// DSI 360 — Helpdesk : export CSV/JSON des tickets
import { tableauVersCSV } from '../../lib/fileUtils'

const STATUT_LABELS = {
  ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente',
  resolu: 'Résolu', ferme: 'Fermé', escalade: 'Escaladé',
}

export function valeurColonneTicket(t, cle) {
  if (cle === 'statut') return STATUT_LABELS[t.statut] || t.statut
  if (cle === 'assigne') return t.assigne ? `${t.assigne.prenom || ''} ${t.assigne.nom}`.trim() : ''
  if (cle === 'demandeur') return t.demandeur ? `${t.demandeur.prenom || ''} ${t.demandeur.nom}`.trim() : ''
  if (cle === 'categorie') return t.itsm_categories_services?.nom || ''
  if (cle === 'sla_echeance') return t.sla_echeance ? new Date(t.sla_echeance).toLocaleString('fr-FR') : ''
  if (cle === 'created_at') return t.created_at ? new Date(t.created_at).toLocaleString('fr-FR') : ''
  return t[cle] ?? ''
}

export function ticketsVersCSV(tickets, colonnes) {
  const entetes = colonnes.map((c) => c.label)
  const lignes = tickets.map((t) => colonnes.map((c) => valeurColonneTicket(t, c.cle)))
  return tableauVersCSV(entetes, lignes)
}
