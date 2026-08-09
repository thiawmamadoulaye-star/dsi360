// DSI 360 — Plan d'action consolidé (Phase 3) — équivalent onglet « Plan d'action »
// Consolide automatiquement les points cotés "Élevé" ou "Critique" sur les
// deux volets (technique + organisationnel), triés par priorité.
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

const PRIORITE_ORDRE = { critique: 0, eleve: 1 }
const PRIORITE_LABELS = { critique: 'Critique', eleve: 'Élevée' }
const PRIORITE_COULEURS = {
  critique: 'bg-red-100 text-red-800 border-red-300',
  eleve: 'bg-orange-100 text-orange-800 border-orange-300',
}

export default function PlanAction({ missionId }) {
  const [lignes, setLignes] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function charger() {
      setLoading(true)
      const { data } = await supabase
        .from('audit_points_controle')
        .select('*')
        .eq('mission_id', missionId)
        .in('niveau_risque', ['critique', 'eleve'])
        .order('niveau_risque')
      const trie = (data || []).sort((a, b) => PRIORITE_ORDRE[a.niveau_risque] - PRIORITE_ORDRE[b.niveau_risque])
      setLignes(trie)
      setLoading(false)
    }
    charger()
  }, [missionId])

  async function changerStatut(id, statut) {
    await supabase.from('audit_points_controle').update({ statut }).eq('id', id)
    setLignes((prev) => prev.map((l) => (l.id === id ? { ...l, statut } : l)))
  }

  function exporterCSV() {
    const entetes = ['Priorité', 'Volet', 'Domaine', 'Recommandation', 'Responsable suggéré', 'Délai suggéré', 'Statut']
    const lignesCsv = lignes.map((l) => [
      PRIORITE_LABELS[l.niveau_risque], l.volet, l.domaine,
      (l.recommandation || '').replace(/\n/g, ' '), l.responsable_suggere || '', l.delai_suggere || '', l.statut,
    ])
    const csv = [entetes, ...lignesCsv].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'plan_action_audit.csv'
    a.click()
  }

  if (loading) return <p>Chargement du plan d'action…</p>

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{lignes.length} recommandation(s) prioritaire(s) (Critique + Élevé)</p>
        <button onClick={exporterCSV} className="border border-navy-300 text-navy-700 rounded px-3 py-1.5 text-sm">
          Exporter CSV
        </button>
      </div>

      <div className="space-y-2">
        {lignes.map((l) => (
          <div key={l.id} className={`border rounded-lg p-4 ${PRIORITE_COULEURS[l.niveau_risque]}`}>
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <span className="text-xs font-bold uppercase">{PRIORITE_LABELS[l.niveau_risque]}</span>
                <p className="font-medium text-navy-900">{l.point_controle} <span className="text-xs font-normal text-gray-500">— {l.domaine}</span></p>
                <p className="text-sm mt-1">{l.recommandation || <em className="text-gray-400">Recommandation à renseigner</em>}</p>
                <p className="text-xs text-gray-500 mt-1">
                  Responsable : {l.responsable_suggere || '—'} · Délai : {l.delai_suggere || '—'}
                </p>
              </div>
              <select
                value={l.statut}
                onChange={(e) => changerStatut(l.id, e.target.value)}
                className="border rounded px-2 py-1 text-sm bg-white"
              >
                <option value="a_traiter">À traiter</option>
                <option value="en_cours">En cours</option>
                <option value="traite">Traité</option>
                <option value="accepte_risque">Risque accepté</option>
              </select>
            </div>
          </div>
        ))}
        {lignes.length === 0 && (
          <p className="text-gray-400 text-sm text-center py-8">
            Aucune recommandation cotée « Élevé » ou « Critique » pour l'instant.
          </p>
        )}
      </div>
    </div>
  )
}
