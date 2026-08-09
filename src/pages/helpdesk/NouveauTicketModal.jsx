// DSI 360 — Helpdesk ITSM : modale de création de ticket (Phase 2)
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function NouveauTicketModal({ onClose, onCreated }) {
  const { tenantId, profile } = useAuth()
  const [categories, setCategories] = useState([])
  const [form, setForm] = useState({
    type_ticket: 'incident',
    categorie_id: '',
    titre: '',
    description: '',
    priorite: 'normale',
  })
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState('')

  useEffect(() => {
    if (!tenantId) return
    supabase
      .from('itsm_categories_services')
      .select('*')
      .eq('tenant_id', tenantId)
      .then(({ data }) => setCategories(data || []))
  }, [tenantId])

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setEnregistrement(true)

    const { error } = await supabase.from('itsm_tickets').insert({
      tenant_id: tenantId,
      demandeur_id: profile.id,
      type_ticket: form.type_ticket,
      categorie_id: form.categorie_id || null,
      titre: form.titre,
      description: form.description,
      priorite: form.priorite,
    })

    setEnregistrement(false)
    if (error) {
      setErreur(error.message)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Nouveau ticket</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Type</label>
              <select
                value={form.type_ticket}
                onChange={(e) => setForm({ ...form, type_ticket: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="incident">Incident</option>
                <option value="demande">Demande</option>
                <option value="probleme">Problème</option>
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Priorité</label>
              <select
                value={form.priorite}
                onChange={(e) => setForm({ ...form, priorite: e.target.value })}
                className="w-full border rounded px-3 py-2"
              >
                <option value="basse">Basse</option>
                <option value="normale">Normale</option>
                <option value="haute">Haute</option>
                <option value="critique">Critique</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Catégorie de service (définit le SLA)</label>
            <select
              value={form.categorie_id}
              onChange={(e) => setForm({ ...form, categorie_id: e.target.value })}
              className="w-full border rounded px-3 py-2"
            >
              <option value="">— Aucune (SLA par défaut 24h) —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.nom} (SLA {c.sla_heures}h)</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Titre</label>
            <input
              required
              value={form.titre}
              onChange={(e) => setForm({ ...form, titre: e.target.value })}
              className="w-full border rounded px-3 py-2"
              placeholder="Ex : Imprimante RH hors service"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Description</label>
            <textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border rounded px-3 py-2"
            />
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">
              Annuler
            </button>
            <button
              type="submit"
              disabled={enregistrement}
              className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60"
            >
              {enregistrement ? 'Création…' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
