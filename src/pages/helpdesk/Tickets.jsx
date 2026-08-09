// DSI 360 — Helpdesk ITSM : liste des tickets (Phase 2)
import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import NouveauTicketModal from './NouveauTicketModal'
import { ROLES } from '../../lib/roles'

const STATUT_LABELS = {
  ouvert: 'Ouvert',
  en_cours: 'En cours',
  en_attente: 'En attente',
  resolu: 'Résolu',
  ferme: 'Fermé',
  escalade: 'Escaladé',
}

const STATUT_COULEURS = {
  ouvert: 'bg-blue-100 text-blue-800',
  en_cours: 'bg-amber-100 text-amber-800',
  en_attente: 'bg-gray-100 text-gray-700',
  resolu: 'bg-green-100 text-green-800',
  ferme: 'bg-gray-200 text-gray-600',
  escalade: 'bg-red-100 text-red-800',
}

const PRIORITE_COULEURS = {
  basse: 'text-gray-500',
  normale: 'text-navy-700',
  haute: 'text-amber-600 font-semibold',
  critique: 'text-red-600 font-bold',
}

export default function Tickets() {
  const { tenantId, profile, role } = useAuth()
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [filtreStatut, setFiltreStatut] = useState('tous')
  const [filtreType, setFiltreType] = useState('tous')
  const [modalOuverte, setModalOuverte] = useState(false)

  const charger = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    let query = supabase
      .from('itsm_tickets')
      .select('*, itsm_categories_services(nom), demandeur:demandeur_id(nom, prenom), assigne:assigne_a(nom, prenom)')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })

    if (filtreStatut !== 'tous') query = query.eq('statut', filtreStatut)
    if (filtreType !== 'tous') query = query.eq('type_ticket', filtreType)

    const { data, error } = await query
    if (error) console.error(error)
    setTickets(data || [])
    setLoading(false)
  }, [tenantId, filtreStatut, filtreType])

  useEffect(() => { charger() }, [charger])

  // Rafraîchissement temps réel (nouveaux tickets, changements de statut)
  useEffect(() => {
    if (!tenantId) return
    const channel = supabase
      .channel('helpdesk-tickets')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'itsm_tickets', filter: `tenant_id=eq.${tenantId}` }, () => {
        charger()
      })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [tenantId, charger])

  function slaBadge(ticket) {
    if (['resolu', 'ferme'].includes(ticket.statut)) return null
    const echeance = new Date(ticket.sla_echeance)
    const enRetard = echeance < new Date()
    return (
      <span className={`text-xs ${enRetard ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
        {enRetard ? '⚠ SLA dépassé' : `SLA : ${echeance.toLocaleString('fr-FR')}`}
      </span>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-navy-900">Helpdesk — Tickets</h1>
        <div className="flex gap-2">
          {[ROLES.DSI, ROLES.IT_MANAGER].includes(role) && (
            <Link to="/helpdesk/categories" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">
              Catalogue de services
            </Link>
          )}
          <button
            onClick={() => setModalOuverte(true)}
            className="bg-navy-900 text-white rounded px-4 py-2 text-sm"
          >
            + Nouveau ticket
          </button>
        </div>
      </div>

      <div className="flex gap-3 mb-4 flex-wrap">
        <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="tous">Tous les statuts</option>
          {Object.entries(STATUT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={filtreType} onChange={(e) => setFiltreType(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
          <option value="tous">Tous les types</option>
          <option value="incident">Incident</option>
          <option value="demande">Demande</option>
          <option value="probleme">Problème</option>
        </select>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-900">
              <tr>
                <th className="text-left px-3 py-2">N°</th>
                <th className="text-left px-3 py-2">Titre</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Priorité</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="text-left px-3 py-2">Assigné à</th>
                <th className="text-left px-3 py-2">SLA</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id} className="border-t hover:bg-navy-50">
                  <td className="px-3 py-2">
                    <Link to={`/helpdesk/${t.id}`} className="text-navy-700 underline">{t.numero}</Link>
                  </td>
                  <td className="px-3 py-2">{t.titre}</td>
                  <td className="px-3 py-2 capitalize">{t.type_ticket}</td>
                  <td className={`px-3 py-2 capitalize ${PRIORITE_COULEURS[t.priorite]}`}>{t.priorite}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[t.statut]}`}>
                      {STATUT_LABELS[t.statut]}
                    </span>
                  </td>
                  <td className="px-3 py-2">{t.assigne ? `${t.assigne.prenom || ''} ${t.assigne.nom}` : '—'}</td>
                  <td className="px-3 py-2">{slaBadge(t)}</td>
                </tr>
              ))}
              {tickets.length === 0 && (
                <tr><td colSpan={7} className="text-center text-gray-400 py-6">Aucun ticket.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOuverte && (
        <NouveauTicketModal
          onClose={() => setModalOuverte(false)}
          onCreated={() => { setModalOuverte(false); charger() }}
        />
      )}
    </div>
  )
}
