// DSI 360 — Registre des traitements de données personnelles (Phase 4)
// Conforme à la loi n° 2008-12 (Sénégal) / RGPD : finalité, base légale,
// catégories de données/personnes, durée de conservation, sous-traitants,
// transferts hors pays.
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const BASES_LEGALES = [
  'Consentement', 'Exécution d\'un contrat', 'Obligation légale',
  'Intérêt vital', 'Mission d\'intérêt public', 'Intérêt légitime',
]

export default function Traitements() {
  const { tenantId, role } = useAuth()
  const [traitements, setTraitements] = useState([])
  const [modalOuverte, setModalOuverte] = useState(false)
  const [enCours, setEnCours] = useState(null) // traitement en édition
  const peutEditer = ['dsi', 'dpo'].includes(role)

  const vide = {
    nom_traitement: '', finalite: '', base_legale: BASES_LEGALES[0],
    categories_donnees: '', categories_personnes: '', duree_conservation: '',
    responsable_traitement: '', sous_traitants: '', mesures_securite: '',
    transferts_hors_pays: false,
  }
  const [form, setForm] = useState(vide)

  const charger = useCallback(async () => {
    if (!tenantId) return
    const { data } = await supabase.from('dp_traitements').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false })
    setTraitements(data || [])
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  function ouvrirNouveau() {
    setEnCours(null)
    setForm(vide)
    setModalOuverte(true)
  }

  function ouvrirEdition(t) {
    setEnCours(t)
    setForm({
      ...t,
      categories_donnees: (t.categories_donnees || []).join(', '),
      categories_personnes: (t.categories_personnes || []).join(', '),
    })
    setModalOuverte(true)
  }

  async function enregistrer(e) {
    e.preventDefault()
    const payload = {
      tenant_id: tenantId,
      nom_traitement: form.nom_traitement,
      finalite: form.finalite,
      base_legale: form.base_legale,
      categories_donnees: form.categories_donnees.split(',').map((s) => s.trim()).filter(Boolean),
      categories_personnes: form.categories_personnes.split(',').map((s) => s.trim()).filter(Boolean),
      duree_conservation: form.duree_conservation,
      responsable_traitement: form.responsable_traitement,
      sous_traitants: form.sous_traitants,
      mesures_securite: form.mesures_securite,
      transferts_hors_pays: form.transferts_hors_pays,
    }
    if (enCours) {
      await supabase.from('dp_traitements').update(payload).eq('id', enCours.id)
    } else {
      await supabase.from('dp_traitements').insert(payload)
    }
    setModalOuverte(false)
    charger()
  }

  async function archiver(id) {
    if (!confirm('Archiver ce traitement ?')) return
    await supabase.from('dp_traitements').update({ statut: 'archive' }).eq('id', id)
    charger()
  }

  function exporterCSV() {
    const entetes = ['Traitement', 'Finalité', 'Base légale', 'Catégories de données', 'Catégories de personnes', 'Durée de conservation', 'Responsable', 'Transferts hors pays', 'Statut']
    const lignes = traitements.map((t) => [
      t.nom_traitement, t.finalite, t.base_legale,
      (t.categories_donnees || []).join(' | '), (t.categories_personnes || []).join(' | '),
      t.duree_conservation, t.responsable_traitement, t.transferts_hors_pays ? 'Oui' : 'Non', t.statut,
    ])
    const csv = [entetes, ...lignes].map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(';')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'registre_traitements.csv'
    a.click()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-navy-900">Registre des traitements</h1>
        <div className="flex gap-2">
          <button onClick={exporterCSV} className="border border-navy-300 text-navy-700 rounded px-4 py-2 text-sm">Exporter CSV</button>
          {peutEditer && (
            <button onClick={ouvrirNouveau} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">+ Nouveau traitement</button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Traitement</th>
              <th className="text-left px-3 py-2">Finalité</th>
              <th className="text-left px-3 py-2">Base légale</th>
              <th className="text-left px-3 py-2">Transfert hors pays</th>
              <th className="text-left px-3 py-2">Statut</th>
              <th className="text-left px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {traitements.map((t) => (
              <tr key={t.id} className="border-t">
                <td className="px-3 py-2 font-medium">{t.nom_traitement}</td>
                <td className="px-3 py-2">{t.finalite}</td>
                <td className="px-3 py-2">{t.base_legale}</td>
                <td className="px-3 py-2">{t.transferts_hors_pays ? <span className="text-amber-600 font-semibold">⚠ Oui</span> : 'Non'}</td>
                <td className="px-3 py-2 capitalize">{t.statut}</td>
                <td className="px-3 py-2 space-x-2">
                  {peutEditer && (
                    <>
                      <button onClick={() => ouvrirEdition(t)} className="text-navy-700 underline text-xs">Modifier</button>
                      {t.statut === 'actif' && (
                        <button onClick={() => archiver(t.id)} className="text-red-600 underline text-xs">Archiver</button>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
            {traitements.length === 0 && <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucun traitement enregistré.</td></tr>}
          </tbody>
        </table>
      </div>

      {modalOuverte && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-navy-900 mb-4">{enCours ? 'Modifier le' : 'Nouveau'} traitement</h2>
            <form onSubmit={enregistrer} className="space-y-3">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Nom du traitement</label>
                <input required value={form.nom_traitement} onChange={(e) => setForm({ ...form, nom_traitement: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : Gestion de la paie" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Finalité</label>
                <textarea required value={form.finalite} onChange={(e) => setForm({ ...form, finalite: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Base légale</label>
                  <select value={form.base_legale} onChange={(e) => setForm({ ...form, base_legale: e.target.value })} className="w-full border rounded px-3 py-2">
                    {BASES_LEGALES.map((b) => <option key={b} value={b}>{b}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Durée de conservation</label>
                  <input value={form.duree_conservation} onChange={(e) => setForm({ ...form, duree_conservation: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : 5 ans après fin de contrat" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Catégories de données (séparées par virgule)</label>
                <input value={form.categories_donnees} onChange={(e) => setForm({ ...form, categories_donnees: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Identité, coordonnées, salaire..." />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Catégories de personnes concernées (séparées par virgule)</label>
                <input value={form.categories_personnes} onChange={(e) => setForm({ ...form, categories_personnes: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Employés, clients, prospects..." />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Responsable du traitement</label>
                <input value={form.responsable_traitement} onChange={(e) => setForm({ ...form, responsable_traitement: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Sous-traitants</label>
                <input value={form.sous_traitants} onChange={(e) => setForm({ ...form, sous_traitants: e.target.value })} className="w-full border rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Mesures de sécurité</label>
                <textarea value={form.mesures_securite} onChange={(e) => setForm({ ...form, mesures_securite: e.target.value })} className="w-full border rounded px-3 py-2" rows={2} />
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={form.transferts_hors_pays} onChange={(e) => setForm({ ...form, transferts_hors_pays: e.target.checked })} />
                Ce traitement implique un transfert de données hors du pays
              </label>

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
