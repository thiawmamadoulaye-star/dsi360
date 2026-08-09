// DSI 360 — Comités IT / COPIL (Phase 5)
// Lien logique optionnel avec un Conseil d'Administration du module
// AFFIC — Gestion CA (existant, application séparée) via affic_conseil_id.
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const TYPE_LABELS = { comite_it: 'Comité IT', copil: 'COPIL', conseil_administration: "Conseil d'Administration (AFFIC)" }
const STATUT_LABELS = { planifie: 'Planifié', tenu: 'Tenu', compte_rendu_valide: 'Compte-rendu validé' }
const STATUT_COULEURS = {
  planifie: 'bg-gray-100 text-gray-700',
  tenu: 'bg-amber-100 text-amber-800',
  compte_rendu_valide: 'bg-green-100 text-green-800',
}

export default function Comites() {
  const { tenantId, role } = useAuth()
  const [comites, setComites] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const [enCours, setEnCours] = useState(null)
  const peutEditer = role === 'dsi' || role === 'super_admin'

  const vide = { type_comite: 'comite_it', date_reunion: '', titre: '', compte_rendu: '', decisions: '', affic_conseil_id: '' }
  const [form, setForm] = useState(vide)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('gouv_comites').select('*').eq('tenant_id', tenantId).order('date_reunion', { ascending: false })
    setComites(data || [])
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  function ouvrirEdition(c) {
    setEnCours(c)
    setForm({ ...c })
    setModalOuverte(true)
  }

  function ouvrirNouveau() {
    setEnCours(null)
    setForm(vide)
    setModalOuverte(true)
  }

  async function enregistrer(e) {
    e.preventDefault()
    const payload = {
      tenant_id: tenantId,
      type_comite: form.type_comite,
      date_reunion: form.date_reunion || null,
      titre: form.titre,
      compte_rendu: form.compte_rendu,
      decisions: form.decisions,
      affic_conseil_id: form.affic_conseil_id || null,
    }
    if (enCours) {
      await supabase.from('gouv_comites').update(payload).eq('id', enCours.id)
    } else {
      await supabase.from('gouv_comites').insert(payload)
    }
    setModalOuverte(false)
    charger()
  }

  async function changerStatut(id, statut) {
    await supabase.from('gouv_comites').update({ statut }).eq('id', id)
    charger()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-navy-900">Comités IT / COPIL</h1>
          <p className="text-sm text-gray-500">Peut être rattaché à un Conseil d'Administration suivi dans AFFIC — Gestion CA</p>
        </div>
        {peutEditer && (
          <button onClick={ouvrirNouveau} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Nouveau comité</button>
        )}
      </div>

      <div className="space-y-3">
        {comites.map((c) => (
          <div key={c.id} className="bg-white rounded-lg shadow-card p-4">
            <div className="flex justify-between items-start flex-wrap gap-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-xs font-semibold text-navy-700">{TYPE_LABELS[c.type_comite]}</span>
                  <span className="text-xs text-gray-400">· {c.date_reunion || 'Date non définie'}</span>
                  {c.affic_conseil_id && <span className="text-xs bg-navy-50 text-navy-700 px-2 py-0.5 rounded">Lié AFFIC</span>}
                </div>
                <p className="font-medium text-navy-900">{c.titre || TYPE_LABELS[c.type_comite]}</p>
                {c.decisions && <p className="text-sm text-gray-600 mt-1"><strong>Décisions :</strong> {c.decisions}</p>}
                {c.compte_rendu && <p className="text-sm text-gray-500 mt-1 line-clamp-2">{c.compte_rendu}</p>}
              </div>
              <div className="flex flex-col gap-2 items-end">
                {peutEditer ? (
                  <select value={c.statut} onChange={(e) => changerStatut(c.id, e.target.value)} className="border rounded px-2 py-1 text-xs">
                    {Object.entries(STATUT_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
                  </select>
                ) : (
                  <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[c.statut]}`}>{STATUT_LABELS[c.statut]}</span>
                )}
                {peutEditer && <button onClick={() => ouvrirEdition(c)} className="text-xs text-navy-700 underline">Modifier</button>}
              </div>
            </div>
          </div>
        ))}
        {comites.length === 0 && <p className="text-gray-400 text-sm text-center py-8">Aucun comité enregistré.</p>}
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy-900 mb-4">{enCours ? 'Modifier le' : 'Nouveau'} comité</h2>
            <form onSubmit={enregistrer} className="space-y-3">
              <select value={form.type_comite} onChange={(e) => setForm({ ...form, type_comite: e.target.value })} className="w-full border rounded px-3 py-2">
                {Object.entries(TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
              </select>
              <input placeholder="Titre" value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} className="w-full border rounded px-3 py-2" />
              <input type="date" value={form.date_reunion || ''} onChange={(e) => setForm({ ...form, date_reunion: e.target.value })} className="w-full border rounded px-3 py-2" />
              {form.type_comite === 'conseil_administration' && (
                <input
                  placeholder="ID du Conseil AFFIC (optionnel, pour lien croisé)"
                  value={form.affic_conseil_id || ''}
                  onChange={(e) => setForm({ ...form, affic_conseil_id: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                />
              )}
              <textarea placeholder="Compte-rendu" value={form.compte_rendu || ''} onChange={(e) => setForm({ ...form, compte_rendu: e.target.value })} className="w-full border rounded px-3 py-2" rows={3} />
              <textarea placeholder="Décisions prises" value={form.decisions || ''} onChange={(e) => setForm({ ...form, decisions: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
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
