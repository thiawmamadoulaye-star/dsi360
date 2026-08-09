// DSI 360 — Module ParcIT : Équipements (migré tel quel dans le socle DSI 360, Phase 1)
// NOTE : ce fichier est un point d'ancrage de migration. La logique complète
// (colonnes paramétrables, obsolescence BIOS > seuil, suppression multiple,
// réorganisation des colonnes) provient de l'application ParcIT existante et
// doit être copiée ici en réutilisant `supabase` et `useAuth` de ce socle
// (au lieu de son propre client Supabase autonome).
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'

export default function Equipements() {
  const { tenantId, role } = useAuth()
  const [equipements, setEquipements] = useState([])
  const [loading, setLoading] = useState(true)
  const peutEditer = peutEditerDonneesOperationnelles(role)

  useEffect(() => {
    if (!tenantId) return
    async function load() {
      setLoading(true)
      const { data, error } = await supabase
        .from('cmdb_equipements')
        .select('*')
        .eq('tenant_id', tenantId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
      if (error) console.error(error)
      setEquipements(data || [])
      setLoading(false)
    }
    load()
  }, [tenantId])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-navy-900">Parc informatique</h1>
        {peutEditer && (
          <button className="bg-navy-900 text-white rounded px-4 py-2 text-sm">
            + Ajouter un équipement
          </button>
        )}
      </div>

      {loading ? (
        <p>Chargement…</p>
      ) : (
        <div className="bg-white rounded-lg shadow-card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-navy-50 text-navy-900">
              <tr>
                <th className="text-left px-3 py-2">Code actif</th>
                <th className="text-left px-3 py-2">Type</th>
                <th className="text-left px-3 py-2">Modèle</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="text-left px-3 py-2">Date BIOS</th>
              </tr>
            </thead>
            <tbody>
              {equipements.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2">{e.code_actif}</td>
                  <td className="px-3 py-2">{e.type_equipement}</td>
                  <td className="px-3 py-2">{e.modele}</td>
                  <td className="px-3 py-2">{e.statut}</td>
                  <td className="px-3 py-2">{e.date_bios}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
