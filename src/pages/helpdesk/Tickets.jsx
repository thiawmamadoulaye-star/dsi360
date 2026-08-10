// DSI 360 — Helpdesk ITSM : liste des tickets (version avancée : colonnes, recherche,
// filtres, tri, sélection multiple + suppression, export CSV/JSON, pagination)
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { ROLES } from '../../lib/roles'
import NouveauTicketModal from './NouveauTicketModal'
import GenericColonnesModal from '../../components/GenericColonnesModal'
import { COLONNES_DISPONIBLES_TICKETS, CLE_PARAMETRE_COLONNES_TICKETS } from './ticketsColonnesConfig'
import { ticketsVersCSV, valeurColonneTicket } from './ticketsCsvUtils'
import { telechargerFichier } from '../../lib/fileUtils'

const STATUT_LABELS = {
  ouvert: 'Ouvert', en_cours: 'En cours', en_attente: 'En attente',
  resolu: 'Résolu', ferme: 'Fermé', escalade: 'Escaladé',
}
const STATUT_COULEURS = {
  ouvert: 'bg-blue-100 text-blue-800', en_cours: 'bg-amber-100 text-amber-800',
  en_attente: 'bg-gray-100 text-gray-700', resolu: 'bg-green-100 text-green-800',
  ferme: 'bg-gray-200 text-gray-600', escalade: 'bg-red-100 text-red-800',
}
const PRIORITE_COULEURS = {
  basse: 'text-gray-500', normale: 'text-navy-700',
  haute: 'text-amber-600 font-semibold', critique: 'text-red-600 font-bold',
}
const TAILLE_PAGE = 25

export default function Tickets() {
  const { tenantId, role } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [colonnesVisibles, setColonnesVisibles] = useState(
    COLONNES_DISPONIBLES_TICKETS.filter((c) => c.parDefaut).map((c) => c.cle)
  )

  const [recherche, setRecherche] = useState('')
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreType, setFiltreType] = useState('tous')
  const [filtrePriorite, setFiltrePriorite] = useState('tous')

  const [tri, setTri] = useState({ cle: 'created_at', sens: 'desc' })
  const [page, setPage] = useState(1)
  const [selection, setSelection] = useState(new Set())

  const [modalOuverte, setModalOuverte] = useState(false)
  const [modalColonnes, setModalColonnes] = useState(false)

  const peutEditer = [ROLES.DSI, ROLES.IT_MANAGER, ROLES.TECHNICIEN].includes(role)

  const charger = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('itsm_tickets')
      .select('*, itsm_categories_services(nom), demandeur:demandeur_id(nom, prenom), assigne:assigne_a(nom, prenom)')
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) console.error(error)
    setTickets(data || [])
    setLoading(false)
    setSelection(new Set())
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (!tenantId) return
    supabase.from('parametres_tenant').select('valeur').eq('tenant_id', tenantId)
      .eq('cle', CLE_PARAMETRE_COLONNES_TICKETS).maybeSingle()
      .then(({ data }) => { if (Array.isArray(data?.valeur)) setColonnesVisibles(data.valeur) })
  }, [tenantId])

  useEffect(() => {
    if (!tenantId) return
    const channel = supabase
      .channel('helpdesk-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itsm_tickets', filter: `tenant_id=eq.${tenantId}` }, () => charger())
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tenantId, charger])

  const filtres = useMemo(() => {
    const q = recherche.trim().toLowerCase()
    return tickets.filter((t) => {
      if (filtreStatut !== 'tous' && t.statut !== filtreStatut) return false
      if (filtreType !== 'tous' && t.type_ticket !== filtreType) return false
      if (filtrePriorite !== 'tous' && t.priorite !== filtrePriorite) return false
      if (q) {
        const cible = [t.numero, t.titre, t.description].filter(Boolean).join(' ').toLowerCase()
        if (!cible.includes(q)) return false
      }
      return true
    })
  }, [tickets, recherche, filtreStatut, filtreType, filtrePriorite])

  const tries = useMemo(() => {
    const copie = [...filtres]
    copie.sort((a, b) => {
      let va = valeurTriable(a, tri.cle)
      let vb = valeurTriable(b, tri.cle)
      if (va == null) va = ''
      if (vb == null) vb = ''
      return tri.sens === 'asc'
        ? String(va).localeCompare(String(vb), 'fr')
        : String(vb).localeCompare(String(va), 'fr')
    })
    return copie
  }, [filtres, tri])

  const totalPages = Math.max(1, Math.ceil(tries.length / TAILLE_PAGE))
  const pageActuelle = Math.min(page, totalPages)
  const pageItems = tries.slice((pageActuelle - 1) * TAILLE_PAGE, pageActuelle * TAILLE_PAGE)

  function changerTri(cle) {
    setTri((prev) => prev.cle === cle ? { cle, sens: prev.sens === 'asc' ? 'desc' : 'asc' } : { cle, sens: 'asc' })
  }

  function toggleSelection(id) {
    setSelection((prev) => {
      const nouveau = new Set(prev)
      nouveau.has(id) ? nouveau.delete(id) : nouveau.add(id)
      return nouveau
    })
  }

  function toggleSelectionPage() {
    const idsPage = pageItems.map((t) => t.id)
    const tousSelectionnes = idsPage.every((id) => selection.has(id))
    setSelection((prev) => {
      const nouveau = new Set(prev)
      idsPage.forEach((id) => tousSelectionnes ? nouveau.delete(id) : nouveau.add(id))
      return nouveau
    })
  }

  async function supprimerSelection() {
    if (selection.size === 0) return
    if (!confirm(`Supprimer les ${selection.size} ticket(s) sélectionné(s) ?`)) return
    const { error } = await supabase.rpc('fn_soft_delete_tickets_bulk', { p_ids: Array.from(selection) })
    if (error) { alert('Erreur : ' + error.message); return }
    charger()
  }

  const colonnesAffichees = COLONNES_DISPONIBLES_TICKETS.filter((c) => colonnesVisibles.includes(c.cle))

  function exporterCSV() {
    telechargerFichier(ticketsVersCSV(tries, colonnesAffichees), 'tickets.csv', 'text/csv;charset=utf-8;')
  }
  function exporterJSON() {
    telechargerFichier(JSON.stringify(tries, null, 2), 'tickets.json', 'application/json')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Helpdesk — Tickets</h1>
          <p className="text-sm text-gray-500">{tries.length} ticket(s) sur {tickets.length}.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {[ROLES.DSI, ROLES.IT_MANAGER].includes(role) && (
            <Link to="/helpdesk/categories" className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">
              Catalogue de services
            </Link>
          )}
          <button onClick={() => setModalColonnes(true)} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">Colonnes</button>
          <button onClick={exporterJSON} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">JSON</button>
          <button onClick={exporterCSV} className="border border-navy-300 text-navy-700 rounded px-3 py-2 text-sm">CSV</button>
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Nouveau ticket</button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-3 mb-3 space-y-2">
        <input
          value={recherche}
          onChange={(e) => { setRecherche(e.target.value); setPage(1) }}
          placeholder="Rechercher n°, titre, description…"
          className="w-full border rounded px-3 py-2 text-sm"
        />
        <div className="flex gap-2 flex-wrap">
          <select value={filtreStatut} onChange={(e) => { setFiltreStatut(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Tous les statuts</option>
            {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filtreType} onChange={(e) => { setFiltreType(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Tous les types</option>
            <option value="incident">Incident</option>
            <option value="demande">Demande</option>
            <option value="probleme">Problème</option>
          </select>
          <select value={filtrePriorite} onChange={(e) => { setFiltrePriorite(e.target.value); setPage(1) }} className="border rounded px-2 py-1.5 text-sm">
            <option value="tous">Toutes priorités</option>
            <option value="basse">Basse</option>
            <option value="normale">Normale</option>
            <option value="haute">Haute</option>
            <option value="critique">Critique</option>
          </select>
        </div>
      </div>

      {selection.size > 0 && peutEditer && (
        <div className="bg-navy-900 text-white rounded-lg px-4 py-2 mb-3 flex items-center justify-between">
          <span className="text-sm">{selection.size} sélectionné(s)</span>
          <button onClick={supprimerSelection} className="bg-red-600 text-white text-sm px-3 py-1.5 rounded">Supprimer la sélection</button>
        </div>
      )}

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-900">
              <tr>
                {peutEditer && (
                  <th className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={pageItems.length > 0 && pageItems.every((t) => selection.has(t.id))}
                      onChange={toggleSelectionPage}
                    />
                  </th>
                )}
                {colonnesAffichees.map((c) => (
                  <th key={c.cle} className="text-left px-3 py-2 cursor-pointer select-none whitespace-nowrap" onClick={() => changerTri(c.cle)}>
                    {c.label} {tri.cle === c.cle ? (tri.sens === 'asc' ? '▲' : '▼') : ''}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pageItems.map((t) => (
                <tr key={t.id} className="border-t hover:bg-navy-50">
                  {peutEditer && (
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={selection.has(t.id)} onChange={() => toggleSelection(t.id)} />
                    </td>
                  )}
                  {colonnesAffichees.map((c) => (
                    <td key={c.cle} className="px-3 py-2 whitespace-nowrap">
                      {renduCelluleTicket(t, c.cle)}
                    </td>
                  ))}
                </tr>
              ))}
              {pageItems.length === 0 && (
                <tr><td colSpan={colonnesAffichees.length + 1} className="text-center text-gray-400 py-6">Aucun ticket ne correspond aux critères.</td></tr>
              )}
            </tbody>
          </table>

          <div className="flex items-center justify-between px-3 py-2 border-t text-sm">
            <span className="text-gray-500">Page {pageActuelle} / {totalPages}</span>
            <div className="flex gap-2">
              <button disabled={pageActuelle <= 1} onClick={() => setPage((p) => p - 1)} className="border rounded px-3 py-1 disabled:opacity-40">Précédent</button>
              <button disabled={pageActuelle >= totalPages} onClick={() => setPage((p) => p + 1)} className="border rounded px-3 py-1 disabled:opacity-40">Suivant</button>
            </div>
          </div>
        </div>
      )}

      {modalOuverte && (
        <NouveauTicketModal onClose={() => setModalOuverte(false)} onCreated={() => { setModalOuverte(false); charger() }} />
      )}
      {modalColonnes && (
        <GenericColonnesModal
          titre="Colonnes à afficher — Tickets"
          colonnesDisponibles={COLONNES_DISPONIBLES_TICKETS}
          clePref={CLE_PARAMETRE_COLONNES_TICKETS}
          colonnesVisibles={colonnesVisibles}
          onClose={() => setModalColonnes(false)}
          onSaved={(nv) => { setColonnesVisibles(nv); setModalColonnes(false) }}
        />
      )}
    </div>
  )
}

function valeurTriable(t, cle) {
  if (cle === 'sla_echeance' || cle === 'created_at') return t[cle] || ''
  return valeurColonneTicket(t, cle)
}

function renduCelluleTicket(t, cle) {
  if (cle === 'numero') {
    return <Link to={`/helpdesk/${t.id}`} className="text-navy-700 underline font-medium">{t.numero}</Link>
  }
  if (cle === 'statut') {
    return <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[t.statut]}`}>{STATUT_LABELS[t.statut]}</span>
  }
  if (cle === 'priorite') {
    return <span className={`capitalize ${PRIORITE_COULEURS[t.priorite]}`}>{t.priorite}</span>
  }
  if (cle === 'type_ticket') return <span className="capitalize">{t.type_ticket}</span>
  if (cle === 'sla_echeance') {
    if (!t.sla_echeance || ['resolu', 'ferme'].includes(t.statut)) return '—'
    const enRetard = new Date(t.sla_echeance) < new Date()
    return <span className={enRetard ? 'text-red-600 font-semibold' : 'text-gray-500'}>{new Date(t.sla_echeance).toLocaleString('fr-FR')}</span>
  }
  return valeurColonneTicket(t, cle) || '—'
}
