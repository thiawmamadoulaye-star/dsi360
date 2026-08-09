// DSI 360 — Analyses d'impact relatives à la protection des données (DPIA) — Phase 4
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STATUT_LABELS = { en_cours: 'En cours', validee: 'Validée', a_revoir: 'À revoir' }
const RISQUE_COULEURS = {
  faible: 'bg-green-100 text-green-800',
  modere: 'bg-amber-100 text-amber-800',
  eleve: 'bg-red-100 text-red-800',
}

export default function DPIA() {
  const { tenantId, role } = useAuth()
  const [dpias, setDpias] = useState([])
  const [traitements, setTraitements] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const peutEditer = ['dsi', 'dpo'].includes(role)

  const vide = { traitement_id: '', niveau_risque: 'modere', mesures_attenuation: '', date_evaluation: new Date().toISOString().slice(0, 10) }
  const [form, setForm] = useState(vide)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase
      .from('dp_dpia')
      .select('*, dp_traitements(nom_traitement)')
      .eq('tenant_id', tenantId)
      .order('date_evaluation', { ascending: false })
    setDpias(data || [])
  }, [tenantId])

  useEffect(() => {
    charger()
    if (tenantId) {
      supabase.from('dp_traitements').select('id, nom_traitement').eq('tenant_id', tenantId).eq('statut', 'actif')
        .then(({ data }) => setTraitements(data || []))
    }
  }, [tenantId, charger])

  async function creer(e) {
    e.preventDefault()
    await supabase.from('dp_dpia').insert({
      tenant_id: tenantId,
      traitement_id: form.traitement_id || null,
      niveau_risque: form.niveau_risque,
      mesures_attenuation: form.mesures_attenuation,
      date_evaluation: form.date_evaluation,
    })
    setModalOuverte(false)
    setForm(vide)
    charger()
  }

  async function changerStatut(id, statut) {
    await supabase.from('dp_dpia').update({ statut }).eq('id', id)
    charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">DPIA — Analyses d'impact</h1>
          <p className="text-sm text-gray-500">Recommandées pour tout traitement à risque élevé (profilage, données sensibles, transferts hors pays...)</p>
        </div>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Nouvelle DPIA</button>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Traitement</th>
              <th className="text-left px-3 py-2">Date d'évaluation</th>
              <th className="text-left px-3 py-2">Niveau de risque</th>
              <th className="text-left px-3 py-2">Mesures d'atténuation</th>
              <th className="text-left px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {dpias.map((d) => (
              <tr key={d.id} className="border-t">
                <td className="px-3 py-2">{d.dp_traitements?.nom_traitement || '—'}</td>
                <td className="px-3 py-2">{d.date_evaluation}</td>
                <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${RISQUE_COULEURS[d.niveau_risque]}`}>{d.niveau_risque}</span></td>
                <td className="px-3 py-2 max-w-xs truncate" title={d.mesures_attenuation}>{d.mesures_attenuation}</td>
                <td className="px-3 py-2">
                  {peutEditer ? (
                    <select value={d.statut} onChange={(e) => changerStatut(d.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                      {Object.entries(STATUT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                  ) : STATUT_LABELS[d.statut]}
                </td>
              </tr>
            ))}
            {dpias.length === 0 && <tr><td colSpan={5} className="text-center text-gray-400 py-6">Aucune DPIA réalisée.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouvelle DPIA</h2>
            <form onSubmit={creer} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Traitement concerné</label>
                <select required value={form.traitement_id} onChange={(e) => setForm({ ...form, traitement_id: e.target.value })} className="w-full border rounded px-3 py-2">
                  <option value="">— Sélectionner —</option>
                  {traitements.map((t) => <option key={t.id} value={t.id}>{t.nom_traitement}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date d'évaluation</label>
                  <input type="date" value={form.date_evaluation} onChange={(e) => setForm({ ...form, date_evaluation: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Niveau de risque</label>
                  <select value={form.niveau_risque} onChange={(e) => setForm({ ...form, niveau_risque: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="faible">Faible</option>
                    <option value="modere">Modéré</option>
                    <option value="eleve">Élevé</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mesures d'atténuation envisagées</label>
                <textarea value={form.mesures_attenuation} onChange={(e) => setForm({ ...form, mesures_attenuation: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} />
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
