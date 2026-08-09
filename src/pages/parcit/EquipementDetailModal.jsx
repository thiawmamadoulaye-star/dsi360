// DSI 360 — ParcIT : détail / édition / suppression d'un équipement
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'
import { useAuth } from '../../contexts/AuthContext'
import { STATUTS, TYPES_EQUIPEMENT } from './parcitConstants'

export default function EquipementDetailModal({ equipement, onClose, onUpdated, onDeleted }) {
  const { role } = useAuth()
  const peutEditer = peutEditerDonneesOperationnelles(role)
  const [modeEdition, setModeEdition] = useState(false)
  const [form, setForm] = useState({ ...equipement })
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function enregistrer(e) {
    e.preventDefault()
    setErreur('')
    setEnregistrement(true)
    const { error } = await supabase.from('cmdb_equipements').update({
      code_actif: form.code_actif || null,
      type_equipement: form.type_equipement,
      marque: form.marque || null,
      modele: form.modele || null,
      numero_serie: form.numero_serie || null,
      processeur: form.processeur || null,
      date_acquisition: form.date_acquisition || null,
      date_bios: form.date_bios || null,
      ram_go: form.ram_go ? Number(form.ram_go) : null,
      os: form.os || null,
      os_version: form.os_version || null,
      localisation: form.localisation || null,
      statut: form.statut,
      cout_acquisition: form.cout_acquisition ? Number(form.cout_acquisition) : null,
      utilisateur_nom_libre: form.utilisateur_nom_libre || null,
    }).eq('id', equipement.id)
    setEnregistrement(false)
    if (error) { setErreur(error.message); return }
    onUpdated()
  }

  async function supprimer() {
    if (!confirm(`Supprimer l'équipement "${equipement.code_actif || equipement.type_equipement}" ? Il sera déplacé vers la corbeille.`)) return
    const { error } = await supabase.rpc('fn_soft_delete_equipement', { p_id: equipement.id })
    if (error) { alert('Erreur : ' + error.message); return }
    onDeleted()
  }

  const champ = (label, key, type = 'text') => (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {modeEdition ? (
        <input
          type={type}
          value={form[key] ?? ''}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          className="w-full border rounded px-3 py-2 text-sm"
        />
      ) : (
        <p className="text-sm text-navy-900">{equipement[key] || '—'}</p>
      )}
    </div>
  )

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-lg font-bold text-navy-900">
            {equipement.code_actif || 'Équipement'} {modeEdition && <span className="text-sm font-normal text-gray-500">(édition)</span>}
          </h2>
          {peutEditer && !modeEdition && (
            <div className="flex gap-2">
              <button onClick={() => setModeEdition(true)} className="text-sm text-navy-700 underline">Modifier</button>
              <button onClick={supprimer} className="text-sm text-red-600 underline">Supprimer</button>
            </div>
          )}
        </div>

        <form onSubmit={enregistrer} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {champ('Code actif', 'code_actif')}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              {modeEdition ? (
                <select value={form.type_equipement} onChange={(e) => setForm({ ...form, type_equipement: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                  {TYPES_EQUIPEMENT.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              ) : <p className="text-sm text-navy-900">{equipement.type_equipement}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ('Marque', 'marque')}
            {champ('Modèle', 'modele')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ('Numéro de série', 'numero_serie')}
            {champ('Processeur', 'processeur')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ("Date d'acquisition", 'date_acquisition', 'date')}
            {champ('Date du BIOS', 'date_bios', 'date')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ('RAM (Go)', 'ram_go', 'number')}
            {champ("Coût d'acquisition (FCFA)", 'cout_acquisition', 'number')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ("Système d'exploitation", 'os')}
            {champ('Version OS', 'os_version')}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {champ('Localisation', 'localisation')}
            <div>
              <label className="block text-xs text-gray-500 mb-1">Statut</label>
              {modeEdition ? (
                <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className="w-full border rounded px-3 py-2 text-sm">
                  {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
                </select>
              ) : <p className="text-sm text-navy-900">{equipement.statut}</p>}
            </div>
          </div>

          {champ('Utilisateur (libre, si non rattaché à un compte)', 'utilisateur_nom_libre')}

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">Fermer</button>
            {modeEdition && (
              <button type="submit" disabled={enregistrement} className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60">
                {enregistrement ? 'Enregistrement…' : 'Enregistrer les modifications'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
