// DSI 360 — Gouvernance IT & PMO : portefeuille de projets (Phase 5)
import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STATUT_LABELS = {
  planifie: 'Planifié', en_cours: 'En cours', en_retard: 'En retard', termine: 'Terminé', abandonne: 'Abandonné',
}
const STATUT_COULEURS = {
  planifie: 'bg-gray-100 text-gray-700',
  en_cours: 'bg-blue-100 text-blue-800',
  en_retard: 'bg-red-100 text-red-800',
  termine: 'bg-green-100 text-green-800',
  abandonne: 'bg-gray-200 text-gray-500',
}
const PRIORITE_COULEURS = {
  faible: 'text-gray-500', moyenne: 'text-navy-700', elevee: 'text-amber-600 font-semibold', strategique: 'text-red-600 font-bold',
}

export default function Projets() {
  const { tenantId, profile, role } = useAuth()
  const [projets, setProjets] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const peutEditer = role === 'dsi' || role === 'super_admin'

  const vide = {
    nom: '', description: '', chef_projet_id: '', budget_capex: '', budget_opex: '',
    date_debut: '', echeance: '', priorite: 'moyenne',
  }
  const [form, setForm] = useState(vide)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('vw_gouv_portefeuille')
      .select('*, gouv_projets(chef_projet_id, description, date_debut)')
      .eq('tenant_id', tenantId)
      .order('priorite')
    setProjets(data || [])
  }, [tenantId])

  useEffect(() => {
    charger()
    if (tenantId) {
      supabase.from('profiles').select('id, nom, prenom').eq('tenant_id', tenantId).then(({ data }) => setUtilisateurs(data || []))
    }
  }, [tenantId, charger])

  async function creer(e) {
    e.preventDefault()
    await supabase.from('gouv_projets').insert({
      tenant_id: tenantId,
      nom: form.nom,
      description: form.description,
      chef_projet_id: form.chef_projet_id || null,
      budget_capex: Number(form.budget_capex) || 0,
      budget_opex: Number(form.budget_opex) || 0,
      date_debut: form.date_debut || null,
      echeance: form.echeance || null,
      priorite: form.priorite,
      statut: 'planifie',
    })
    setModalOuverte(false)
    setForm(vide)
    charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-navy-900">Portefeuille de projets IT</h1>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Nouveau projet</button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Projet</th>
              <th className="text-left px-3 py-2">Priorité</th>
              <th className="text-left px-3 py-2">Avancement</th>
              <th className="text-left px-3 py-2">Budget total</th>
              <th className="text-left px-3 py-2">Consommation</th>
              <th className="text-left px-3 py-2">Échéance</th>
              <th className="text-left px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {projets.map((p) => (
              <tr key={p.projet_id} className="border-t hover:bg-navy-50">
                <td className="px-3 py-2">
                  <Link to={`/gouvernance/projets/${p.projet_id}`} className="text-navy-700 underline font-medium">{p.nom}</Link>
                </td>
                <td className={`px-3 py-2 capitalize ${PRIORITE_COULEURS[p.priorite]}`}>{p.priorite}</td>
                <td className="px-3 py-2">
                  <div className="w-24 bg-gray-100 rounded h-2">
                    <div className="bg-navy-700 h-2 rounded" style={{ width: `${p.avancement_pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500">{p.avancement_pct}%</span>
                </td>
                <td className="px-3 py-2">{new Intl.NumberFormat('fr-FR').format(p.budget_total)} FCFA</td>
                <td className={`px-3 py-2 ${p.consommation_budget_pct > 100 ? 'text-red-600 font-semibold' : p.consommation_budget_pct > 85 ? 'text-amber-600' : ''}`}>
                  {p.consommation_budget_pct}%
                </td>
                <td className={`px-3 py-2 ${p.en_retard ? 'text-red-600 font-semibold' : ''}`}>{p.echeance || '—'}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[p.statut]}`}>{STATUT_LABELS[p.statut]}</span>
                </td>
              </tr>
            ))}
            {projets.length === 0 && <tr><td colSpan={7} className="text-center text-gray-400 py-6">Aucun projet enregistré.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouveau projet IT</h2>
            <form onSubmit={creer} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nom du projet</label>
                <input required value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Chef de projet</label>
                <select value={form.chef_projet_id} onChange={(e) => setForm({ ...form, chef_projet_id: e.target.value })} className="w-full border rounded px-3 py-2">
                  <option value="">— Non assigné —</option>
                  {utilisateurs.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Budget CAPEX (FCFA)</label>
                  <input type="number" value={form.budget_capex} onChange={(e) => setForm({ ...form, budget_capex: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Budget OPEX (FCFA)</label>
                  <input type="number" value={form.budget_opex} onChange={(e) => setForm({ ...form, budget_opex: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date de début</label>
                  <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Échéance</label>
                  <input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Priorité</label>
                <select value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })} className="w-full border rounded px-3 py-2">
                  <option value="faible">Faible</option>
                  <option value="moyenne">Moyenne</option>
                  <option value="elevee">Élevée</option>
                  <option value="strategique">Stratégique</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOuverte(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Créer le projet</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
