// DSI 360 — Synthèse de mission (Phase 3) — équivalent onglet « Synthèse »
// du fichier Excel : maturité moyenne par domaine + répartition des risques.
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const RISQUE_COULEURS = {
  critique: 'bg-red-500',
  eleve: 'bg-orange-500',
  modere: 'bg-amber-400',
  faible: 'bg-green-500',
}

export default function Synthese({ missionId }) {
  const [parDomaine, setParDomaine] = useState([])
  const [globale, setGlobale] = useState(null)

  useEffect(() => {
    async function charger() {
      const { data: d1 } = await supabase
        .from('vw_audit_synthese_domaine')
        .select('*')
        .eq('mission_id', missionId)
        .order('domaine')
      setParDomaine(d1 || [])

      const { data: d2 } = await supabase
        .from('vw_audit_synthese_globale')
        .select('*')
        .eq('mission_id', missionId)
        .single()
      setGlobale(d2)
    }
    charger()
  }, [missionId])

  const totalRisques = globale
    ? (globale.nb_critique || 0) + (globale.nb_eleve || 0) + (globale.nb_modere || 0) + (globale.nb_faible || 0)
    : 0

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <div className="bg-white rounded-lg shadow-card p-5">
          <p className="text-sm text-gray-500">Maturité globale de la mission</p>
          <p className="text-4xl font-bold text-navy-900">{globale?.maturite_globale ?? '—'} <span className="text-lg text-gray-400">/ 5</span></p>
          <p className="text-xs text-gray-400 mt-1">{globale?.nb_points_total || 0} points de contrôle évalués (technique + organisationnel)</p>
        </div>

        <div className="bg-white rounded-lg shadow-card p-5">
          <p className="text-sm text-gray-500 mb-2">Répartition des niveaux de risque</p>
          {totalRisques === 0 ? (
            <p className="text-gray-400 text-sm">Aucun point de contrôle coté pour l'instant.</p>
          ) : (
            <>
              <div className="flex h-4 rounded overflow-hidden mb-2">
                {['critique', 'eleve', 'modere', 'faible'].map((niveau) => {
                  const key = `nb_${niveau}`
                  const val = globale?.[key] || 0
                  const pct = totalRisques ? (val / totalRisques) * 100 : 0
                  return pct > 0 ? <div key={niveau} className={RISQUE_COULEURS[niveau]} style={{ width: `${pct}%` }} /> : null
                })}
              </div>
              <div className="grid grid-cols-2 gap-1 text-sm">
                <span>🔴 Critique : <strong>{globale?.nb_critique || 0}</strong></span>
                <span>🟠 Élevé : <strong>{globale?.nb_eleve || 0}</strong></span>
                <span>🟡 Modéré : <strong>{globale?.nb_modere || 0}</strong></span>
                <span>🟢 Faible : <strong>{globale?.nb_faible || 0}</strong></span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-5">
        <p className="font-semibold text-navy-900 mb-3">Maturité moyenne par domaine / catégorie</p>
        <div className="space-y-2">
          {parDomaine.map((d) => (
            <div key={`${d.volet}-${d.domaine}`}>
              <div className="flex justify-between text-sm mb-0.5">
                <span>{d.domaine} <span className="text-xs text-gray-400">({d.volet})</span></span>
                <span className="font-medium">{d.maturite_moyenne ?? '—'} / 5 · {d.nb_points} pts</span>
              </div>
              <div className="w-full bg-gray-100 rounded h-2">
                <div
                  className="bg-navy-700 h-2 rounded"
                  style={{ width: `${((d.maturite_moyenne || 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}
          {parDomaine.length === 0 && <p className="text-gray-400 text-sm">Aucune donnée pour l'instant.</p>}
        </div>
      </div>
    </div>
  )
}
