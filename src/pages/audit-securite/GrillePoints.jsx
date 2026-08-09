// DSI 360 — Composant réutilisable : grille de points de contrôle
// (utilisé pour le volet "technique" ET le volet "organisationnel", Phase 3)
import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'
import { useAuth } from '../../contexts/AuthContext'

const MATURITE_LABELS = {
  0: '0 — Inexistant',
  1: '1 — Initial / ad hoc',
  2: '2 — Répétable',
  3: '3 — Défini',
  4: '4 — Maîtrisé',
  5: '5 — Optimisé',
}

const RISQUE_COULEURS = {
  faible: 'bg-green-100 text-green-800',
  modere: 'bg-amber-100 text-amber-800',
  eleve: 'bg-orange-100 text-orange-800',
  critique: 'bg-red-100 text-red-800',
}

const STATUT_OPTIONS = [
  { value: 'a_traiter', label: 'À traiter' },
  { value: 'en_cours', label: 'En cours' },
  { value: 'traite', label: 'Traité' },
  { value: 'accepte_risque', label: 'Risque accepté' },
]

export default function GrillePoints({ missionId, volet }) {
  const { role } = useAuth()
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [domaineOuvert, setDomaineOuvert] = useState(null)
  const peutEditer = peutEditerDonneesOperationnelles(role) || role === 'rssi'

  const charger = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('audit_points_controle')
      .select('*')
      .eq('mission_id', missionId)
      .eq('volet', volet)
      .order('ordre')
    setPoints(data || [])
    setLoading(false)
  }, [missionId, volet])

  useEffect(() => { charger() }, [charger])

  const domaines = useMemo(() => {
    const groupes = {}
    points.forEach((p) => {
      if (!groupes[p.domaine]) groupes[p.domaine] = []
      groupes[p.domaine].push(p)
    })
    return groupes
  }, [points])

  async function majPoint(id, champs) {
    setPoints((prev) => prev.map((p) => (p.id === id ? { ...p, ...champs } : p)))
    await supabase.from('audit_points_controle').update(champs).eq('id', id)
  }

  if (loading) return <p>Chargement de la grille…</p>

  return (
    <div className="space-y-3">
      {Object.entries(domaines).map(([domaine, pts]) => {
        const moyenne = pts.filter((p) => p.maturite != null).length
          ? (pts.reduce((s, p) => s + (p.maturite || 0), 0) / pts.filter((p) => p.maturite != null).length).toFixed(1)
          : '—'
        const ouvert = domaineOuvert === domaine || domaineOuvert === null

        return (
          <div key={domaine} className="bg-white rounded-lg shadow-card overflow-hidden">
            <button
              onClick={() => setDomaineOuvert(domaineOuvert === domaine ? '__none__' : domaine)}
              className="w-full flex items-center justify-between px-4 py-3 bg-navy-50 hover:bg-navy-100 text-left"
            >
              <span className="font-semibold text-navy-900">{domaine}</span>
              <span className="text-sm text-gray-600">Maturité moy. : <strong>{moyenne}</strong> / 5 · {pts.length} points</span>
            </button>

            {ouvert && (
              <div className="divide-y">
                {pts.map((p) => (
                  <div key={p.id} className="p-4">
                    <div className="flex justify-between items-start gap-4 flex-wrap">
                      <div className="flex-1 min-w-[240px]">
                        <p className="font-medium text-navy-800">{p.point_controle}</p>
                        <p className="text-xs text-gray-500">{p.element_a_verifier}</p>
                      </div>
                      <div className="flex gap-2 items-center flex-wrap">
                        <select
                          value={p.maturite ?? ''}
                          onChange={(e) => majPoint(p.id, { maturite: e.target.value === '' ? null : Number(e.target.value) })}
                          disabled={!peutEditer}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          <option value="">Maturité —</option>
                          {Object.entries(MATURITE_LABELS).map(([v, l]) => (
                            <option key={v} value={v}>{l}</option>
                          ))}
                        </select>
                        <select
                          value={p.niveau_risque ?? ''}
                          onChange={(e) => majPoint(p.id, { niveau_risque: e.target.value || null })}
                          disabled={!peutEditer}
                          className={`border rounded px-2 py-1 text-sm ${p.niveau_risque ? RISQUE_COULEURS[p.niveau_risque] : ''}`}
                        >
                          <option value="">Risque —</option>
                          <option value="faible">Faible</option>
                          <option value="modere">Modéré</option>
                          <option value="eleve">Élevé</option>
                          <option value="critique">Critique</option>
                        </select>
                        <select
                          value={p.statut}
                          onChange={(e) => majPoint(p.id, { statut: e.target.value })}
                          disabled={!peutEditer}
                          className="border rounded px-2 py-1 text-sm"
                        >
                          {STATUT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                        </select>
                      </div>
                    </div>

                    {peutEditer && (
                      <div className="grid md:grid-cols-2 gap-3 mt-3">
                        <textarea
                          placeholder="Constat / observation terrain…"
                          defaultValue={p.constat || ''}
                          onBlur={(e) => majPoint(p.id, { constat: e.target.value })}
                          rows={2}
                          className="border rounded px-3 py-2 text-sm"
                        />
                        <textarea
                          placeholder="Recommandation…"
                          defaultValue={p.recommandation || ''}
                          onBlur={(e) => majPoint(p.id, { recommandation: e.target.value })}
                          rows={2}
                          className="border rounded px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="Responsable suggéré"
                          defaultValue={p.responsable_suggere || ''}
                          onBlur={(e) => majPoint(p.id, { responsable_suggere: e.target.value })}
                          className="border rounded px-3 py-2 text-sm"
                        />
                        <input
                          placeholder="Délai suggéré (ex : 0-1 mois)"
                          defaultValue={p.delai_suggere || ''}
                          onBlur={(e) => majPoint(p.id, { delai_suggere: e.target.value })}
                          className="border rounded px-3 py-2 text-sm"
                        />
                      </div>
                    )}
                    {!peutEditer && p.constat && (
                      <p className="text-sm text-gray-600 mt-2"><strong>Constat :</strong> {p.constat}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
