// DSI 360 — Plan d'action de conformité consolidé (Phase 4)
// Regroupe les actions issues du registre, des DPIA et des violations.
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const ORIGINE_LABELS = {
  registre_traitement: 'Registre des traitements',
  dpia: 'DPIA',
  violation: 'Violation',
  audit_conformite: 'Audit de conformité',
  autre: 'Autre',
}
const PRIORITE_COULEURS = {
  critique: 'bg-red-100 text-red-800 border-red-300',
  elevee: 'bg-orange-100 text-orange-800 border-orange-300',
  moyenne: 'bg-amber-100 text-amber-800 border-amber-300',
  faible: 'bg-green-100 text-green-800 border-green-300',
}
const PRIORITE_ORDRE = { critique: 0, elevee: 1, moyenne: 2, faible: 3 }

export default function PlanConformite() {
  const { tenantId, profile, role } = useAuth()
  const [actions, setActions] = useState([])
  const [utilisateurs, setUtilisateurs] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const peutEditer = ['dsi', 'dpo'].includes(role)

  const vide = { origine: 'autre', action: '', priorite: 'moyenne', responsable_id: '', echeance: '' }
  const [form, setForm] = useState(vide)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('dp_plans_action')
      .select('*, responsable:responsable_id(nom, prenom)')
      .eq('tenant_id', tenantId)
      .order('echeance', { ascending: true, nullsFirst: false })
    const trie = (data || []).sort((a, b) => PRIORITE_ORDRE[a.priorite] - PRIORITE_ORDRE[b.priorite])
    setActions(trie)
  }, [tenantId])

  useEffect(() => {
    charger()
    if (tenantId) {
      supabase.from('profiles').select('id, nom, prenom').eq('tenant_id', tenantId).then(({ data }) => setUtilisateurs(data || []))
    }
  }, [tenantId, charger])

  async function ajouter(e) {
    e.preventDefault()
    await supabase.from('dp_plans_action').insert({
      tenant_id: tenantId,
      origine: form.origine,
      action: form.action,
      priorite: form.priorite,
      responsable_id: form.responsable_id || null,
      echeance: form.echeance || null,
    })
    setModalOuverte(false)
    setForm(vide)
    charger()
  }

  async function changerStatut(id, statut) {
    await supabase.from('dp_plans_action').update({ statut }).eq('id', id)
    charger()
  }

  function estEnRetard(a) {
    return a.echeance && new Date(a.echeance) < new Date() && !['fait', 'abandonne'].includes(a.statut)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Plan de conformité</h1>
          <p className="text-sm text-gray-500">Actions consolidées : registre, DPIA, violations, audits</p>
        </div>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Ajouter une action</button>
        )}
      </div>

      <div className="space-y-2">
        {actions.map((a) => (
          <div key={a.id} className={`border rounded-lg p-4 ${PRIORITE_COULEURS[a.priorite]}`}>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-bold uppercase">{a.priorite}</span>
                  <span className="text-xs text-gray-500">· {ORIGINE_LABELS[a.origine]}</span>
                  {estEnRetard(a) && <span className="text-xs font-bold text-red-700">⚠ EN RETARD</span>}
                </div>
                <p className="font-medium text-navy-900">{a.action}</p>
                <p className="text-xs text-gray-600 mt-1">
                  Responsable : {a.responsable ? `${a.responsable.prenom || ''} ${a.responsable.nom}` : '—'} · Échéance : {a.echeance || '—'}
                </p>
              </div>
              {peutEditer && (
                <select value={a.statut} onChange={(e) => changerStatut(a.id, e.target.value)} className="border rounded px-2 py-1 text-sm bg-white">
                  <option value="a_faire">À faire</option>
                  <option value="en_cours">En cours</option>
                  <option value="fait">Fait</option>
                  <option value="abandonne">Abandonné</option>
                </select>
              )}
            </div>
          </div>
        ))}
        {actions.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucune action de conformité enregistrée.</p>}
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouvelle action de conformité</h2>
            <form onSubmit={ajouter} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Origine</label>
                <select value={form.origine} onChange={(e) => setForm({ ...form, origine: e.target.value })} className="w-full border rounded px-3 py-2">
                  {Object.entries(ORIGINE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Action à mener</label>
                <textarea required value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Priorité</label>
                  <select value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="faible">Faible</option>
                    <option value="moyenne">Moyenne</option>
                    <option value="elevee">Élevée</option>
                    <option value="critique">Critique</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Échéance</label>
                  <input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Responsable</label>
                <select value={form.responsable_id} onChange={(e) => setForm({ ...form, responsable_id: e.target.value })} className="w-full border rounded px-3 py-2">
                  <option value="">— Non assigné —</option>
                  {utilisateurs.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom}</option>)}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOuverte(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-navy-900 text-white rounded">Enregistrer</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
