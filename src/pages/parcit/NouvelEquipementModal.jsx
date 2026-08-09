// DSI 360 — ParcIT : modale d'ajout d'équipement
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const STATUTS = [
  { value: 'en_service', label: 'En service' },
  { value: 'en_cours_utilisation', label: 'En cours d\'utilisation' },
  { value: 'en_stock', label: 'En stock' },
  { value: 'en_maintenance', label: 'En maintenance' },
  { value: 'obsolete', label: 'Obsolète' },
  { value: 'reforme', label: 'Réformé' },
  { value: 'perdu_vole', label: 'Perdu / Volé' },
]

const TYPES_EQUIPEMENT = ['PC portable', 'PC bureau', 'Serveur', 'Switch', 'Routeur', 'Imprimante', 'Mobile', 'Tablette', 'Écran', 'Autre']

const vide = {
  code_actif: '', type_equipement: TYPES_EQUIPEMENT[0], marque: '', modele: '',
  numero_serie: '', date_acquisition: '', date_bios: '', ram_go: '',
  os: '', os_version: '', localisation: '', statut: 'en_service', cout_acquisition: '',
}

export default function NouvelEquipementModal({ onClose, onCreated }) {
  const { tenantId, profile } = useAuth()
  const [form, setForm] = useState(vide)
  const [enregistrement, setEnregistrement] = useState(false)
  const [erreur, setErreur] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    setErreur('')
    setEnregistrement(true)

    const { error } = await supabase.from('cmdb_equipements').insert({
      tenant_id: tenantId,
      code_actif: form.code_actif || null,
      type_equipement: form.type_equipement,
      marque: form.marque || null,
      modele: form.modele || null,
      numero_serie: form.numero_serie || null,
      date_acquisition: form.date_acquisition || null,
      date_bios: form.date_bios || null,
      ram_go: form.ram_go ? Number(form.ram_go) : null,
      os: form.os || null,
      os_version: form.os_version || null,
      localisation: form.localisation || null,
      statut: form.statut,
      cout_acquisition: form.cout_acquisition ? Number(form.cout_acquisition) : null,
      created_by: profile?.id,
    })

    setEnregistrement(false)
    if (error) {
      setErreur(error.message)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-navy-900 mb-4">Ajouter un équipement</h2>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Code actif (inventaire)</label>
              <input value={form.code_actif} onChange={(e) => setForm({ ...form, code_actif: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : PC-0142" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Type d'équipement</label>
              <select value={form.type_equipement} onChange={(e) => setForm({ ...form, type_equipement: e.target.value })} className="w-full border rounded px-3 py-2">
                {TYPES_EQUIPEMENT.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Marque</label>
              <input value={form.marque} onChange={(e) => setForm({ ...form, marque: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : HP, Dell, Lenovo…" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Modèle</label>
              <input value={form.modele} onChange={(e) => setForm({ ...form, modele: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Numéro de série</label>
            <input value={form.numero_serie} onChange={(e) => setForm({ ...form, numero_serie: e.target.value })} className="w-full border rounded px-3 py-2" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Date d'acquisition</label>
              <input type="date" value={form.date_acquisition} onChange={(e) => setForm({ ...form, date_acquisition: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Date du BIOS</label>
              <input type="date" value={form.date_bios} onChange={(e) => setForm({ ...form, date_bios: e.target.value })} className="w-full border rounded px-3 py-2" />
              <p className="text-xs text-gray-500 mt-1">Utilisée pour le calcul automatique d'obsolescence</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">RAM (Go)</label>
              <input type="number" value={form.ram_go} onChange={(e) => setForm({ ...form, ram_go: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Coût d'acquisition (FCFA)</label>
              <input type="number" value={form.cout_acquisition} onChange={(e) => setForm({ ...form, cout_acquisition: e.target.value })} className="w-full border rounded px-3 py-2" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Système d'exploitation</label>
              <input value={form.os} onChange={(e) => setForm({ ...form, os: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : Windows, Linux…" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Version OS</label>
              <input value={form.os_version} onChange={(e) => setForm({ ...form, os_version: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : 11 Pro, Ubuntu 22.04…" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-700 mb-1">Localisation</label>
              <input value={form.localisation} onChange={(e) => setForm({ ...form, localisation: e.target.value })} className="w-full border rounded px-3 py-2" placeholder="Ex : Dakar - Plateau, Bureau 3" />
            </div>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Statut</label>
              <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })} className="w-full border rounded px-3 py-2">
                {STATUTS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>

          {erreur && <p className="text-sm text-red-600">{erreur}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">Annuler</button>
            <button type="submit" disabled={enregistrement} className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60">
              {enregistrement ? 'Ajout…' : 'Ajouter l\'équipement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
