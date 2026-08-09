// DSI 360 — Détail d'une mission d'audit (Phase 3) — onglets Technique /
// Organisationnel / Synthèse / Plan d'action, reproduisant la structure du
// classeur Excel (Grille d'audit + Grille organisationnelle + Synthèse + Plan d'action).
import React, { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'
import GrillePoints from './GrillePoints'
import Synthese from './Synthese'
import PlanAction from './PlanAction'

const ONGLETS = [
  { key: 'technique', label: 'Grille technique (8 domaines)' },
  { key: 'organisationnel', label: 'Grille organisationnelle (9 catégories)' },
  { key: 'synthese', label: 'Synthèse' },
  { key: 'plan_action', label: "Plan d'action" },
]

const STATUT_MISSION = ['cadrage', 'en_cours', 'synthese', 'cloture']

export default function MissionDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { role } = useAuth()
  const [mission, setMission] = useState(null)
  const [onglet, setOnglet] = useState('technique')
  const peutEditer = peutEditerDonneesOperationnelles(role) || role === 'rssi'

  const charger = useCallback(async () => {
    const { data } = await supabase.from('audit_missions').select('*').eq('id', id).single()
    setMission(data)
  }, [id])

  useEffect(() => { charger() }, [charger])

  async function changerStatutMission(statut) {
    await supabase.from('audit_missions').update({ statut }).eq('id', id)
    charger()
  }

  if (!mission) return <p>Chargement…</p>

  return (
    <div>
      <button onClick={() => navigate('/audit-securite')} className="text-sm text-navy-700 mb-3">← Retour aux missions</button>

      <div className="bg-white rounded-lg shadow-card p-5 mb-4 flex justify-between items-start flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-navy-900">{mission.client_nom}</h1>
          <p className="text-sm text-gray-500">
            Réf. {mission.reference_lettre_mission || '—'} · {mission.date_debut} → {mission.date_fin || '?'}
          </p>
        </div>
        {peutEditer && (
          <select
            value={mission.statut}
            onChange={(e) => changerStatutMission(e.target.value)}
            className="border rounded px-3 py-1.5 text-sm"
          >
            {STATUT_MISSION.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        )}
      </div>

      <div className="flex gap-1 mb-4 border-b overflow-x-auto">
        {ONGLETS.map((o) => (
          <button
            key={o.key}
            onClick={() => setOnglet(o.key)}
            className={`px-4 py-2 text-sm whitespace-nowrap border-b-2 ${
              onglet === o.key ? 'border-navy-900 text-navy-900 font-semibold' : 'border-transparent text-gray-500'
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {onglet === 'technique' && <GrillePoints missionId={id} volet="technique" />}
      {onglet === 'organisationnel' && <GrillePoints missionId={id} volet="organisationnel" />}
      {onglet === 'synthese' && <Synthese missionId={id} />}
      {onglet === 'plan_action' && <PlanAction missionId={id} />}
    </div>
  )
}
