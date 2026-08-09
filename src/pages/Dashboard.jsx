// DSI 360 — Dashboard exécutif avancé (Phase 6)
// Vue consolidée tous modules, avec graphiques (donut, barres, jauge) et
// widgets réordonnables (préférence stockée dans parametres_tenant).
import React, { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabaseClient'
import { ROLES } from '../lib/roles'
import DonutChart from '../components/charts/DonutChart'
import BarChart from '../components/charts/BarChart'
import GaugeChart from '../components/charts/GaugeChart'

const WIDGETS_PAR_DEFAUT = ['parcit', 'helpdesk', 'cyber', 'conformite', 'gouvernance']
const WIDGET_LABELS = {
  parcit: 'Parc informatique',
  helpdesk: 'Helpdesk ITSM',
  cyber: 'Cybersécurité & Audit SI',
  conformite: 'Data Privacy / Conformité',
  gouvernance: 'Gouvernance IT & PMO',
}

export default function Dashboard() {
  const { role, tenantId, profile } = useAuth()
  const [stats, setStats] = useState(null)
  const [repartitionRisques, setRepartitionRisques] = useState([])
  const [tendanceTickets, setTendanceTickets] = useState([])
  const [ordreWidgets, setOrdreWidgets] = useState(WIDGETS_PAR_DEFAUT)
  const peutReorganiser = role === ROLES.DSI || role === ROLES.SUPER_ADMIN

  const charger = useCallback(async () => {
    if (!tenantId) return

    const { data: d } = await supabase.from('vw_dashboard_executif_v2').select('*').eq('tenant_id', tenantId).single()
    setStats(d)

    const { data: risques } = await supabase.from('vw_dashboard_risques_repartition').select('*').eq('tenant_id', tenantId)
    setRepartitionRisques(risques || [])

    const { data: tickets } = await supabase.from('vw_dashboard_tickets_tendance').select('*').eq('tenant_id', tenantId).order('jour')
    setTendanceTickets(tickets || [])

    const { data: pref } = await supabase.from('parametres_tenant').select('valeur').eq('tenant_id', tenantId).eq('cle', 'dashboard_layout').maybeSingle()
    if (pref?.valeur?.widgets_ordre) setOrdreWidgets(pref.valeur.widgets_ordre)
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  async function sauvegarderOrdre(nouvelOrdre) {
    setOrdreWidgets(nouvelOrdre)
    await supabase.from('parametres_tenant').upsert(
      { tenant_id: tenantId, cle: 'dashboard_layout', valeur: { widgets_ordre: nouvelOrdre }, updated_by: profile.id },
      { onConflict: 'tenant_id,cle' }
    )
  }

  function deplacer(index, direction) {
    const nouveau = [...ordreWidgets]
    const cible = index + direction
    if (cible < 0 || cible >= nouveau.length) return
    ;[nouveau[index], nouveau[cible]] = [nouveau[cible], nouveau[index]]
    sauvegarderOrdre(nouveau)
  }

  const couleursRisque = { critique: '#dc2626', eleve: '#f97316', modere: '#f59e0b', faible: '#22c55e' }
  const dataRisques = ['critique', 'eleve', 'modere', 'faible'].map((n) => ({
    label: n.charAt(0).toUpperCase() + n.slice(1),
    value: repartitionRisques.find((r) => r.niveau === n)?.nb || 0,
    color: couleursRisque[n],
  }))

  const dataTendance = tendanceTickets.slice(-14).map((t) => ({
    label: new Date(t.jour).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }),
    value: t.nb_crees,
    value2: t.nb_resolus,
  }))

  const consommationBudget = stats?.budget_projets_en_cours > 0
    ? Math.round((stats.cout_reel_projets_en_cours / stats.budget_projets_en_cours) * 100)
    : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">
            {role === ROLES.DG ? 'Tableau de bord exécutif' : 'Tableau de bord'}
          </h1>
          <p className="text-sm text-gray-500">Vue consolidée — tous modules DSI 360</p>
        </div>
      </div>

      {/* KPI globaux */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Équipements obsolètes" value={stats?.nb_equipements_obsoletes} alerte={stats?.nb_equipements_obsoletes > 0} />
        <StatCard label="Tickets ouverts" value={stats?.tickets_ouverts} alerte={stats?.tickets_escalades > 0} />
        <StatCard label="Risques Élevé/Critique" value={stats?.risques_critiques_ouverts} alerte={stats?.risques_critiques_ouverts > 0} />
        <StatCard label="⚠ Violations CDP en retard" value={stats?.violations_cdp_en_retard} critique={stats?.violations_cdp_en_retard > 0} />
        <StatCard label="Projets en retard" value={stats?.projets_en_retard} alerte={stats?.projets_en_retard > 0} />
        <StatCard label="Contrats à échéance (60j)" value={stats?.contrats_a_echeance} alerte={stats?.contrats_a_echeance > 0} />
        <StatCard label="Actions conformité ouvertes" value={stats?.actions_conformite_ouvertes} />
        <StatCard label="Vulnérabilités ouvertes" value={stats?.vulnerabilites_ouvertes} alerte={stats?.vulnerabilites_ouvertes > 0} />
      </div>

      {/* Graphiques */}
      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="font-semibold text-navy-900 mb-2 text-sm">Répartition des risques cyber</p>
          <DonutChart data={dataRisques} centerValue={dataRisques.reduce((s, d) => s + d.value, 0)} centerLabel="risques" />
        </div>

        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="font-semibold text-navy-900 mb-2 text-sm">Maturité moyenne d'audit</p>
          <div className="flex justify-center">
            <GaugeChart value={stats?.maturite_audit_moyenne || 0} max={5} label="Maturité globale (0-5)" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-card p-4">
          <p className="font-semibold text-navy-900 mb-2 text-sm">Consommation budgétaire (projets en cours)</p>
          <div className="flex justify-center">
            <GaugeChart
              value={consommationBudget} max={100}
              label={`${new Intl.NumberFormat('fr-FR').format(stats?.cout_reel_projets_en_cours || 0)} / ${new Intl.NumberFormat('fr-FR').format(stats?.budget_projets_en_cours || 0)} FCFA`}
              couleurs={[{ seuil: 0.85, couleur: '#16a34a' }, { seuil: 1, couleur: '#d97706' }, { seuil: 999, couleur: '#dc2626' }]}
            />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card p-4 mb-6">
        <p className="font-semibold text-navy-900 mb-3 text-sm">Tendance Helpdesk — 14 derniers jours</p>
        <BarChart data={dataTendance} legend={['Créés', 'Résolus']} />
      </div>

      {/* Widgets par module — réordonnables par le DSI */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="font-semibold text-navy-900 text-sm">Accès rapide aux modules</p>
          {peutReorganiser && <p className="text-xs text-gray-400">Utilisez les flèches pour réorganiser</p>}
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          {ordreWidgets.map((cle, index) => (
            <div key={cle} className="bg-white rounded-lg shadow-card p-4 flex items-center justify-between">
              <Link to={`/${cle === 'cyber' ? 'audit-securite' : cle === 'conformite' ? 'data-privacy' : cle}`} className="text-navy-800 font-medium hover:underline">
                {WIDGET_LABELS[cle]}
              </Link>
              {peutReorganiser && (
                <div className="flex gap-1">
                  <button onClick={() => deplacer(index, -1)} disabled={index === 0} className="text-xs border rounded px-2 py-1 disabled:opacity-30">↑</button>
                  <button onClick={() => deplacer(index, 1)} disabled={index === ordreWidgets.length - 1} className="text-xs border rounded px-2 py-1 disabled:opacity-30">↓</button>
                </div>
              )}
            </div>
          ))}
        </div>
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
