// DSI 360 — Gestion des violations de données personnelles (Phase 4)
// Calcule automatiquement l'échéance légale de notification CDP (72h).
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STATUT_LABELS = { ouverte: 'Ouverte', en_investigation: 'En investigation', cloturee: 'Clôturée' }
const GRAVITE_COULEURS = {
  mineure: 'bg-green-100 text-green-800',
  significative: 'bg-amber-100 text-amber-800',
  majeure: 'bg-red-100 text-red-800',
}

export default function Violations() {
  const { tenantId, role } = useAuth()
  const [violations, setViolations] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const peutEditer = ['dsi', 'dpo'].includes(role)

  const vide = {
    date_incident: new Date().toISOString().slice(0, 16),
    description: '', donnees_concernees: '', nb_personnes_impactees: '',
    gravite: 'significative', mesures_prises: '',
  }
  const [form, setForm] = useState(vide)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('dp_violations').select('*').eq('tenant_id', tenantId).order('date_incident', { ascending: false })
    setViolations(data || [])
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  async function declarer(e) {
    e.preventDefault()
    await supabase.from('dp_violations').insert({
      tenant_id: tenantId,
      date_incident: new Date(form.date_incident).toISOString(),
      description: form.description,
      donnees_concernees: form.donnees_concernees,
      nb_personnes_impactees: form.nb_personnes_impactees ? Number(form.nb_personnes_impactees) : null,
      gravite: form.gravite,
      mesures_prises: form.mesures_prises,
    })
    setModalOuverte(false)
    setForm(vide)
    charger()
  }

  async function marquerNotifieeCDP(id) {
    await supabase.from('dp_violations').update({ notifie_cdp: true, date_notification_cdp: new Date().toISOString().slice(0, 10) }).eq('id', id)
    charger()
  }

  async function changerStatut(id, statut) {
    await supabase.from('dp_violations').update({ statut }).eq('id', id)
    charger()
  }

  function tempsRestant(echeance, notifie) {
    if (notifie) return { texte: '✅ CDP notifiée', couleur: 'text-green-600' }
    const diffMs = new Date(echeance) - new Date()
    if (diffMs < 0) return { texte: '🔴 Délai 72h dépassé', couleur: 'text-red-600 font-bold' }
    const heures = Math.floor(diffMs / 3600000)
    if (heures < 24) return { texte: `🟠 ${heures}h restantes avant échéance CDP`, couleur: 'text-orange-600 font-semibold' }
    return { texte: `${heures}h restantes avant échéance CDP (72h)`, couleur: 'text-gray-500' }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Violations de données personnelles</h1>
          <p className="text-sm text-gray-500">Notification CDP obligatoire sous 72h en cas de risque pour les personnes</p>
        </div>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-red-600 text-white rounded px-4 py-2 text-sm font-semibold">
            ⚠ Déclarer une violation
          </button>
        )}
      </div>

      <div className="space-y-3">
        {violations.map((v) => {
          const restant = tempsRestant(v.echeance_notification_cdp, v.notifie_cdp)
          return (
            <div key={v.id} className="bg-white rounded-lg shadow-card p-4">
              <div className="flex justify-between items-start flex-wrap gap-2">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    {v.gravite && <span className={`text-xs px-2 py-0.5 rounded ${GRAVITE_COULEURS[v.gravite]}`}>{v.gravite}</span>}
                    <span className="text-xs text-gray-400">{new Date(v.date_incident).toLocaleString('fr-FR')}</span>
                  </div>
                  <p className="font-medium text-navy-900">{v.description}</p>
                  <p className="text-sm text-gray-600 mt-1">Données concernées : {v.donnees_concernees || '—'}</p>
                  <p className="text-sm text-gray-600">Personnes impactées : {v.nb_personnes_impactees ?? '—'}</p>
                  <p className={`text-sm mt-2 ${restant.couleur}`}>{restant.texte}</p>
                </div>
                {peutEditer && (
                  <div className="flex flex-col gap-2 items-end">
                    <select value={v.statut} onChange={(e) => changerStatut(v.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                      {Object.entries(STATUT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                    </select>
                    {!v.notifie_cdp && (
                      <button onClick={() => marquerNotifieeCDP(v.id)} className="text-xs bg-navy-900 text-white rounded px-3 py-1">
                        Marquer CDP notifiée
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {violations.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucune violation déclarée.</p>}
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
            <h2 className="text-lg font-bold text-red-700 mb-4">⚠ Déclarer une violation de données</h2>
            <form onSubmit={declarer} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Date/heure de l'incident</label>
                <input type="datetime-local" required value={form.date_incident} onChange={(e) => setForm({ ...form, date_incident: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Description de l'incident</label>
                <textarea required value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Données concernées</label>
                <input value={form.donnees_concernees} onChange={(e) => setForm({ ...form, donnees_concernees: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : Noms, emails, salaires..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Nb personnes impactées</label>
                  <input type="number" value={form.nb_personnes_impactees} onChange={(e) => setForm({ ...form, nb_personnes_impactees: e.target.value })} className="w-full border rounded px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Gravité</label>
                  <select value={form.gravite} onChange={(e) => setForm({ ...form, gravite: e.target.value })} className="w-full border rounded px-3 py-2">
                    <option value="mineure">Mineure</option>
                    <option value="significative">Significative</option>
                    <option value="majeure">Majeure</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mesures prises</label>
                <textarea value={form.mesures_prises} onChange={(e) => setForm({ ...form, mesures_prises: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <p className="text-xs text-gray-500">
                L'échéance de notification à la CDP (72h après l'incident) sera calculée automatiquement.
              </p>
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setModalOuverte(false)} className="px-4 py-2 text-sm border rounded">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm bg-red-600 text-white rounded font-semibold">Déclarer la violation</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
