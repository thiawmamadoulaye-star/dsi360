// DSI 360 — Administration : Corbeille (restauration des suppressions)
// Le bouton de restauration n'est actif que pour les profils dont
// `peut_restaurer_suppressions = true` (voir 04_security_triggers.sql).
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

export default function Corbeille() {
  const { tenantId, profile } = useAuth()
  const [elements, setElements] = useState([])

  useEffect(() => {
    if (!tenantId) return
    charger()
  }, [tenantId])

  async function charger() {
    const { data } = await supabase
      .from('cmdb_equipements')
      .select('*')
      .eq('tenant_id', tenantId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    setElements(data || [])
  }

  async function restaurer(id) {
    const { error } = await supabase.rpc('fn_restaurer_equipement', { p_id: id })
    if (error) {
      alert('Restauration refusée : ' + error.message)
    } else {
      charger()
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900 mb-4">Corbeille — Équipements supprimés</h1>
      {!profile?.peut_restaurer_suppressions && (
        <p className="text-sm text-amber-600 mb-3">
          Vous pouvez consulter la corbeille, mais la restauration nécessite un droit
          spécifique accordé par un administrateur.
        </p>
      )}
      <div className="bg-white rounded-lg shadow-card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-navy-50 text-navy-900">
            <tr>
              <th className="text-left px-3 py-2">Code actif</th>
              <th className="text-left px-3 py-2">Supprimé le</th>
              <th className="text-left px-3 py-2">Action</th>
            </tr>
          </thead>
          <tbody>
            {elements.map((e) => (
              <tr key={e.id} className="border-t">
                <td className="px-3 py-2">{e.code_actif}</td>
                <td className="px-3 py-2">{new Date(e.deleted_at).toLocaleString('fr-FR')}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => restaurer(e.id)}
                    disabled={!profile?.peut_restaurer_suppressions}
                    className="text-navy-700 underline disabled:text-gray-400 disabled:no-underline"
                  >
                    Restaurer
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
