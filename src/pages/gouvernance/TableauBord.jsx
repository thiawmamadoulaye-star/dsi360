// DSI 360 — Gouvernance IT & PMO : tableau de bord (Phase 5)
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
      .from('vw_gouv_tableau_bord')
      .select('*')
      .eq('tenant_id', tenantId)
      .single()
      .then(({ data }) => setStats(data))
  }, [tenantId])

  const consommation = stats?.budget_total_en_cours > 0
    ? Math.round((stats.cout_reel_en_cours / stats.budget_total_en_cours) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Gouvernance IT & PMO</h1>
          <p className="text-sm text-gray-500">Portefeuille de projets, budgets, contrats, comités</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link to="/gouvernance/projets" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">Projets</Link>
          <Link to="/gouvernance/contrats" className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">Contrats fournisseurs</Link>
          <Link to="/gouvernance/comites" className="bg-navy-900 text-white rounded px-4 py-2 text-sm">Comités IT / COPIL</Link>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Projets en cours" value={stats?.projets_en_cours} />
        <StatCard label="Projets en retard" value={stats?.projets_en_retard} alerte={stats?.projets_en_retard > 0} />
        <StatCard label="Budget total (projets en cours)" value={formatFCFA(stats?.budget_total_en_cours)} />
        <StatCard label="Coût réel engagé" value={formatFCFA(stats?.cout_reel_en_cours)} />
        <StatCard label="Contrats à échéance (60j)" value={stats?.contrats_a_echeance} alerte={stats?.contrats_a_echeance > 0} />
        <StatCard label="Contrats expirés" value={stats?.contrats_expires} critique={stats?.contrats_expires > 0} />
        <StatCard label="Comités planifiés" value={stats?.comites_planifies} />
        <StatCard label="Consommation budgétaire" value={`${consommation}%`} critique={consommation > 100} alerte={consommation > 85 && consommation <= 100} />
      </div>
    </div>
  )
}

function formatFCFA(val) {
  if (val == null) return '—'
  return new Intl.NumberFormat('fr-FR').format(val) + ' FCFA'
}

function StatCard({ label, value, alerte, critique }) {
  const couleur = critique ? 'text-red-600' : alerte ? 'text-amber-600' : 'text-navy-900'
  return (
    <div className="bg-white rounded-lg shadow-card p-4">
      <p className={`text-xl font-bold ${couleur}`}>{value ?? '—'}</p>
      <p className="text-sm text-gray-500">{label}</p>
    </div>
  )
}
