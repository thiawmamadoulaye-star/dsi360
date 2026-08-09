// DSI 360 — Helpdesk ITSM : détail d'un ticket + commentaires (Phase 2)
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'

const STATUTS = ['ouvert', 'en_cours', 'en_attente', 'resolu', 'ferme', 'escalade']

export default function TicketDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { tenantId, profile, role } = useAuth()
  const [ticket, setTicket] = useState(null)
  const [commentaires, setCommentaires] = useState([])
  const [nouveauCommentaire, setNouveauCommentaire] = useState('')
  const [techniciens, setTechniciens] = useState([])
  const peutEditer = peutEditerDonneesOperationnelles(role)

  const charger = useCallback(async () => {
    const { data: t } = await supabase
      .from('itsm_tickets')
      .select('*, itsm_categories_services(nom, sla_heures), demandeur:demandeur_id(nom, prenom), assigne:assigne_a(nom, prenom)')
      .eq('id', id)
      .single()
    setTicket(t)

    const { data: c } = await supabase
      .from('itsm_ticket_commentaires')
      .select('*, auteur:auteur_id(nom, prenom)')
      .eq('ticket_id', id)
      .order('created_at', { ascending: true })
    setCommentaires(c || [])
  }, [id])

  useEffect(() => { charger() }, [charger])

  useEffect(() => {
    if (!tenantId) return
    supabase
      .from('profiles')
      .select('id, nom, prenom, role')
      .eq('tenant_id', tenantId)
      .in('role', ['dsi', 'it_manager', 'technicien'])
      .then(({ data }) => setTechniciens(data || []))
  }, [tenantId])

  async function changerStatut(statut) {
    await supabase.from('itsm_tickets').update({
      statut,
      date_resolution: statut === 'resolu' ? new Date().toISOString() : ticket.date_resolution,
    }).eq('id', id)
    charger()
  }

  async function assigner(userId) {
    await supabase.from('itsm_tickets').update({ assigne_a: userId || null }).eq('id', id)
    charger()
  }

  async function ajouterCommentaire(e) {
    e.preventDefault()
    if (!nouveauCommentaire.trim()) return
    await supabase.from('itsm_ticket_commentaires').insert({
      tenant_id: tenantId,
      ticket_id: id,
      auteur_id: profile.id,
      message: nouveauCommentaire.trim(),
    })
    setNouveauCommentaire('')
    charger()
  }

  if (!ticket) return <p>Chargement…</p>

  const slaEnRetard = ticket.sla_echeance && new Date(ticket.sla_echeance) < new Date() && !['resolu', 'ferme'].includes(ticket.statut)

  return (
    <div>
      <button onClick={() => navigate('/helpdesk')} className="text-sm text-navy-700 mb-3">← Retour aux tickets</button>

      <div className="bg-white rounded-lg shadow-card p-5 mb-4">
        <div className="flex justify-between items-start flex-wrap gap-2">
          <div>
            <p className="text-xs text-gray-500">{ticket.numero} · {ticket.type_ticket}</p>
            <h1 className="text-xl font-bold text-navy-900">{ticket.titre}</h1>
          </div>
          {slaEnRetard && (
            <span className="bg-red-100 text-red-700 text-xs font-semibold px-3 py-1 rounded">
              ⚠ SLA dépassé
            </span>
          )}
        </div>

        <p className="text-gray-700 mt-3 whitespace-pre-wrap">{ticket.description}</p>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 text-sm">
          <div>
            <p className="text-gray-500">Demandeur</p>
            <p className="font-medium">{ticket.demandeur?.prenom} {ticket.demandeur?.nom}</p>
          </div>
          <div>
            <p className="text-gray-500">Catégorie</p>
            <p className="font-medium">{ticket.itsm_categories_services?.nom || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500">Priorité</p>
            <p className="font-medium capitalize">{ticket.priorite}</p>
          </div>
          <div>
            <p className="text-gray-500">Échéance SLA</p>
            <p className="font-medium">{ticket.sla_echeance ? new Date(ticket.sla_echeance).toLocaleString('fr-FR') : '—'}</p>
          </div>
        </div>

        {peutEditer && (
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Statut</label>
              <select value={ticket.statut} onChange={(e) => changerStatut(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
                {STATUTS.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Assigné à</label>
              <select value={ticket.assigne_a || ''} onChange={(e) => assigner(e.target.value)} className="border rounded px-3 py-1.5 text-sm">
                <option value="">— Non assigné —</option>
                {techniciens.map((t) => (
                  <option key={t.id} value={t.id}>{t.prenom} {t.nom}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card p-5">
        <h2 className="font-semibold text-navy-900 mb-3">Commentaires</h2>
        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
          {commentaires.map((c) => (
            <div key={c.id} className="text-sm border-b pb-2">
              <p className="font-medium text-navy-800">{c.auteur?.prenom} {c.auteur?.nom}
                <span className="text-gray-400 font-normal"> · {new Date(c.created_at).toLocaleString('fr-FR')}</span>
              </p>
              <p className="text-gray-700">{c.message}</p>
            </div>
          ))}
          {commentaires.length === 0 && <p className="text-gray-400 text-sm">Aucun commentaire pour l'instant.</p>}
        </div>

        <form onSubmit={ajouterCommentaire} className="flex gap-2">
          <input
            value={nouveauCommentaire}
            onChange={(e) => setNouveauCommentaire(e.target.value)}
            placeholder="Ajouter un commentaire…"
            className="flex-1 border rounded px-3 py-2 text-sm"
          />
          <button type="submit" className="bg-navy-900 text-white rounded px-4 py-2 text-sm">Envoyer</button>
        </form>
      </div>
    </div>
  )
}
