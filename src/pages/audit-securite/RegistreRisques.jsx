// DSI 360 — Registre des risques cyber (Phase 3) — Matrice probabilité × impact
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'

const NIVEAU_COULEURS = {
  critique: 'bg-red-500 text-white',
  eleve: 'bg-orange-400 text-white',
  modere: 'bg-amber-300 text-navy-900',
  faible: 'bg-green-300 text-navy-900',
}

function niveauDe(prob, impact) {
  const score = prob * impact
  if (score >= 16) return 'critique'
  if (score >= 9) return 'eleve'
  if (score >= 4) return 'modere'
  return 'faible'
}

export default function RegistreRisques() {
  const { tenantId, role } = useAuth()
  const [risques, setRisques] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const [form, setForm] = useState({ risque: '', probabilite: 3, impact: 3, plan_remediation: '', echeance: '' })
  const peutEditer = peutEditerDonneesOperationnelles(role) || role === 'rssi'

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('cyber_risques').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
    setRisques(data || [])
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  async function ajouter(e) {
    e.preventDefault()
    await supabase.from('cyber_risques').insert({
      tenant_id: tenantId,
      risque: form.risque,
      probabilite: form.probabilite,
      impact: form.impact,
      plan_remediation: form.plan_remediation,
      echeance: form.echeance || null,
    })
    setModalOuverte(false)
    setForm({ risque: '', probabilite: 3, impact: 3, plan_remediation: '', echeance: '' })
    charger()
  }

  async function changerStatut(id, statut) {
    await supabase.from('cyber_risques').update({ statut }).eq('id', id)
    charger()
  }

  // Construction de la matrice 5x5 (impact en colonnes, probabilité en lignes)
  const matrice = Array.from({ length: 5 }, (_, i) => 5 - i) // probabilité 5 → 1
  const colonnes = [1, 2, 3, 4, 5] // impact 1 → 5

  function risquesDansCellule(prob, impact) {
    return risques.filter((r) => r.probabilite === prob && r.impact === impact && r.statut !== 'clos')
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Registre des risques cyber</h1>
          <p className="text-sm text-gray-500">Matrice de risques (probabilité × impact) — méthodologie du Guide d'Audit</p>
        </div>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">
            + Ajouter un risque
          </button>
        )}
      </div>

      {/* Matrice de risques */}
      <div className="bg-white rounded-lg shadow-card p-4 mb-6 overflow-x-auto">
        <table className="w-full text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-1"></th>
              <th colSpan={5} className="text-center text-navy-900 font-semibold pb-1">Impact →</th>
            </tr>
            <tr>
              <th className="p-1"></th>
              {colonnes.map((c) => <th key={c} className="p-1 text-center">{c}</th>)}
            </tr>
          </thead>
          <tbody>
            {matrice.map((prob) => (
              <tr key={prob}>
                {prob === 5 && <th rowSpan={5} className="p-1 text-navy-900 font-semibold" style={{ writingMode: 'vertical-rl' }}>↑ Probabilité</th>}
                <th className="p-1 text-center">{prob}</th>
                {colonnes.map((impact) => {
                  const niveau = niveauDe(prob, impact)
                  const items = risquesDansCellule(prob, impact)
                  return (
                    <td key={impact} className={`border p-1 align-top min-w-[90px] h-16 ${NIVEAU_COULEURS[niveau]}`}>
                      {items.map((it) => (
                        <p key={it.id} className="text-[10px] leading-tight mb-0.5" title={it.risque}>
                          • {it.risque.length > 22 ? it.risque.slice(0, 22) + '…' : it.risque}
                        </p>
                      ))}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Liste détaillée */}
      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Risque</th>
              <th className="text-left px-3 py-2">Prob.</th>
              <th className="text-left px-3 py-2">Impact</th>
              <th className="text-left px-3 py-2">Niveau</th>
              <th className="text-left px-3 py-2">Échéance</th>
              <th className="text-left px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody>
            {risques.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="px-3 py-2">{r.risque}</td>
                <td className="px-3 py-2">{r.probabilite}</td>
                <td className="px-3 py-2">{r.impact}</td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded text-xs ${NIVEAU_COULEURS[r.niveau]}`}>{r.niveau}</span>
                </td>
                <td className="px-3 py-2">{r.echeance || '—'}</td>
                <td className="px-3 py-2">
                  <select value={r.statut} onChange={(e) => changerStatut(r.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                    <option value="ouvert">Ouvert</option>
                    <option value="en_traitement">En traitement</option>
                    <option value="clos">Clos</option>
                    <option value="accepte">Accepté</option>
                  </select>
                </td>
              </tr>
            ))}
            {risques.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucun risque enregistré.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouveau risque</h2>
            <form onSubmit={ajouter} className="space-y-3">
              <textarea required placeholder="Description du risque" value={form.risque} onChange={(e) => setForm({ ...form, risque: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Probabilité (1-5)</label>
                  <input type="number" min={1} max={5} value={form.probabilite} onChange={(e) => setForm({ ...form, probabilite: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Impact (1-5)</label>
                  <input type="number" min={1} max={5} value={form.impact} onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <textarea placeholder="Plan de remédiation" value={form.plan_remediation} onChange={(e) => setForm({ ...form, plan_remediation: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              <div>
                <label className="block text-xs text-gray-500 mb-1">Échéance</label>
                <input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} className="w-full border rounded px-3 py-2" />
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
