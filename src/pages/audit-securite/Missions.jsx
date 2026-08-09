// DSI 360 — Cybersécurité & Audit SI : liste et création des missions (Phase 3)
// Créer une mission duplique automatiquement la grille (37 pts technique +
// 41 pts organisationnel), équivalent numérique de la duplication du fichier
// Excel gabarit « Grille_Audit_Securite_SI_AL_AMANA.xlsx ».
import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STATUT_LABELS = {
  cadrage: 'Cadrage',
  en_cours: 'En cours',
  synthese: 'Synthèse',
  cloture: 'Clôturée',
}

export default function Missions() {
  const { tenantId } = useAuth()
  const [missions, setMissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOuverte, setModalOuverte] = useState(false)
  const [form, setForm] = useState({ client_nom: '', reference_lettre_mission: '', date_debut: '', date_fin: '' })
  const [creation, setCreation] = useState(false)

  const charger = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    const { data } = await supabase
      .from('audit_missions')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
    setMissions(data || [])
    setLoading(false)
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  async function creerMission(e) {
    e.preventDefault()
    setCreation(true)
    const { error } = await supabase.rpc('fn_creer_mission_audit', {
      p_client_nom: form.client_nom,
      p_reference_lettre_mission: form.reference_lettre_mission || null,
      p_date_debut: form.date_debut || new Date().toISOString().slice(0, 10),
      p_date_fin: form.date_fin || null,
    })
    setCreation(false)
    if (error) {
      alert('Erreur : ' + error.message)
      return
    }
    setModalOuverte(false)
    setForm({ client_nom: '', reference_lettre_mission: '', date_debut: '', date_fin: '' })
    charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Cybersécurité & Audit SI — Missions</h1>
          <p className="text-sm text-gray-500">Grille d'Audit Sécurité SI (8 domaines) + Grille Organisationnelle ISO/IEC 27002 (9 catégories)</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/audit-securite/risques" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">
            Registre des risques
          </Link>
          <Link to="/audit-securite/vulnerabilites" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">
            Vulnérabilités
          </Link>
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">
            + Nouvelle mission
          </button>
        </div>
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-900">
              <tr>
                <th className="text-left px-3 py-2">Client</th>
                <th className="text-left px-3 py-2">Référence</th>
                <th className="text-left px-3 py-2">Période</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="text-left px-3 py-2">Maturité globale</th>
                <th className="text-left px-3 py-2">Action</th>
              </tr>
            </thead>
            <tbody>
              {missions.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{m.client_nom}</td>
                  <td className="px-3 py-2">{m.reference_lettre_mission || '—'}</td>
                  <td className="px-3 py-2">{m.date_debut} → {m.date_fin || '?'}</td>
                  <td className="px-3 py-2">{STATUT_LABELS[m.statut]}</td>
                  <td className="px-3 py-2">{m.maturite_globale ?? '—'} / 5</td>
                  <td className="px-3 py-2">
                    <Link to={`/audit-securite/${m.id}`} className="text-navy-700 underline">Ouvrir</Link>
                  </td>
                </tr>
              ))}
              {missions.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucune mission. Créez-en une pour démarrer.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
            <h2 className="text-lg font-bold text-navy-900 mb-4">Nouvelle mission d'audit</h2>
            <form onSubmit={creerMission} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nom du client</label>
                <input required value={form.client_nom} onChange={(e) => setForm({ ...form, client_nom: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : COMPTOIR SAHEL DISTRIBUTION SARL" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Référence lettre de mission</label>
                <input value={form.reference_lettre_mission} onChange={(e) => setForm({ ...form, reference_lettre_mission: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : LM-2026-04" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date de début</label>
                  <input type="date" value={form.date_debut} onChange={(e) => setForm({ ...form, date_debut: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Date de fin prévue</label>
                  <input type="date" value={form.date_fin} onChange={(e) => setForm({ ...form, date_fin: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
              </div>
              <p className="text-xs text-gray-500">
                La grille complète (37 points techniques + 41 points organisationnels) sera automatiquement dupliquée pour cette mission.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOuverte(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" disabled={creation} className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60">
                  {creation ? 'Création…' : 'Créer la mission'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
