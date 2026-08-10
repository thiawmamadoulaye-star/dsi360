// DSI 360 — Modale générique de sélection des colonnes affichées (réutilisable par tous les modules)
import React, { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../contexts/AuthContext'

export default function GenericColonnesModal({ titre = 'Colonnes à afficher', colonnesDisponibles, clePref, colonnesVisibles, onClose, onSaved }) {
  const { tenantId, profile } = useAuth()
  const [selection, setSelection] = useState(colonnesVisibles)
  const [enregistrement, setEnregistrement] = useState(false)

  function toggle(cle) {
    setSelection((prev) => prev.includes(cle) ? prev.filter((c) => c !== cle) : [...prev, cle])
  }

  async function enregistrer() {
    setEnregistrement(true)
    await supabase.from('parametres_tenant').upsert(
      { tenant_id: tenantId, cle: clePref, valeur: selection, updated_by: profile?.id },
      { onConflict: 'tenant_id,cle' }
    )
    setEnregistrement(false)
    onSaved(selection)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6">
        <h2 className="text-lg font-bold text-navy-900 mb-4">{titre}</h2>
        <div className="space-y-2 max-h-80 overflow-y-auto">
          {colonnesDisponibles.map((c) => (
            <label key={c.cle} className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={selection.includes(c.cle)} onChange={() => toggle(c.cle)} />
              {c.label}
            </label>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-4">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">Annuler</button>
          <button onClick={enregistrer} disabled={enregistrement} className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60">
            {enregistrement ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </div>
    </div>
  )
}
