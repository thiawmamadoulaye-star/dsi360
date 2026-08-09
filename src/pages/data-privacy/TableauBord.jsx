// DSI 360 — Data Privacy : tableau de bord conformité (Phase 4)
import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function TableauBord() {
  const { tenantId } = useAuth()
  const [stats, setStats] = useState(null)

  useEffect(() => {
    if (!tenantId) return
    supabase
      .from('vw_dp_tableau_bord')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data }) => setStats(data))
  }, [tenantId])

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Data Privacy / Conformité</h1>
          <p className="text-sm text-gray-500">Registre CDP Sénégal / RGPD — vue d'ensemble</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/data-privacy/traitements" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">Registre des traitements</Link>
          <Link to="/data-privacy/violations" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">Violations</Link>
          <Link to="/data-privacy/dpia" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">DPIA</Link>
          <Link to="/data-privacy/plan-action" className="bg-navy-900 text-white rounded px-4 py-2 text-sm">Plan de conformité</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Traitements actifs" value={stats?.traitements_actifs} />
        <StatCard label="Dont avec transfert hors pays" value={stats?.traitements_avec_transfert} alerte={stats?.traitements_avec_transfert > 0} />
        <StatCard label="Violations ouvertes" value={stats?.violations_ouvertes} alerte={stats?.violations_ouvertes > 0} />
        <StatCard label="⚠ Notif. CDP en retard" value={stats?.violations_cdp_en_retard} critique={stats?.violations_cdp_en_retard > 0} />
        <StatCard label="DPIA en cours" value={stats?.dpia_en_cours} />
        <StatCard label="DPIA à revoir" value={stats?.dpia_a_revoir} alerte={stats?.dpia_a_revoir > 0} />
        <StatCard label="Actions de conformité ouvertes" value={stats?.actions_conformite_ouvertes} />
        <StatCard label="Actions en retard" value={stats?.actions_conformite_en_retard} critique={stats?.actions_conformite_en_retard > 0} />
      </div>

      <div className="bg-white rounded-lg shadow-card p-5 mt-6">
        <p className="font-semibold text-navy-900 mb-2">Rappel réglementaire</p>
        <p className="text-sm text-gray-600">
          Toute violation de données à caractère personnel susceptible d'engendrer un risque pour les
          personnes concernées doit être notifiée à la Commission de Protection des Données Personnelles (CDP)
          dans un délai de <strong>72 heures</strong> à compter de sa connaissance (alignement RGPD / loi n° 2008-12 Sénégal).
          Le module <Link to="/data-privacy/violations" className="text-navy-700 underline">Violations</Link> calcule
          automatiquement cette échéance et déclenche des alertes.
        </p>
      </div>
    </div>
  )
}

function StatCard({ label, value, alerte, critique }) {
  const couleur = critique ? 'text-red-600' : alerte ? 'text-amber-600' : 'text-navy-900'
  return (
    <div className="bg-white rounded-lg shadow-card p-4">
      <p className={`text-2xl font-bold ${couleur}`}>{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
