// DSI 360 — Module ParcIT : Équipements
import React, { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { peutEditerDonneesOperationnelles } from '../../lib/roles'
import NouvelEquipementModal from './NouvelEquipementModal'

const STATUT_LABELS = {
  en_service: 'En service',
  en_cours_utilisation: 'En cours d\'utilisation',
  en_stock: 'En stock',
  en_maintenance: 'En maintenance',
  obsolete: 'Obsolète',
  reforme: 'Réformé',
  perdu_vole: 'Perdu / Volé',
}

const STATUT_COULEURS = {
  en_service: 'bg-green-100 text-green-800',
  en_cours_utilisation: 'bg-blue-100 text-blue-800',
  en_stock: 'bg-gray-100 text-gray-700',
  en_maintenance: 'bg-amber-100 text-amber-800',
  obsolete: 'bg-red-100 text-red-800',
  reforme: 'bg-gray-200 text-gray-600',
  perdu_vole: 'bg-red-200 text-red-900',
}

export default function Equipements() {
  const { tenantId, role } = useAuth()
  const [equipements, setEquipements] = useState([])
  const [loading, setLoading] = useState(true)
  const [modalOuverte, setModalOuverte] = useState(false)
  const peutEditer = peutEditerDonneesOperationnelles(role)

  const charger = useCallback(async () => {
    if (!tenantId) return
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
  }, [tenantId])

  useEffect(() => { charger() }, [charger])

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-xl font-bold text-navy-900">Parc informatique</h1>
        {peutEditer && (
          <button onClick={() => setModalOuverte(true)} className="bg-navy-900 text-white rounded px-4 py-2 text-sm">
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
                <th className="text-left px-3 py-2">Marque / Modèle</th>
                <th className="text-left px-3 py-2">Localisation</th>
                <th className="text-left px-3 py-2">Statut</th>
                <th className="text-left px-3 py-2">Date BIOS</th>
              </tr>
            </thead>
            <tbody>
              {equipements.map((e) => (
                <tr key={e.id} className="border-t">
                  <td className="px-3 py-2 font-medium">{e.code_actif || '—'}</td>
                  <td className="px-3 py-2">{e.type_equipement}</td>
                  <td className="px-3 py-2">{[e.marque, e.modele].filter(Boolean).join(' ') || '—'}</td>
                  <td className="px-3 py-2">{e.localisation || '—'}</td>
                  <td className="px-3 py-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUT_COULEURS[e.statut]}`}>
                      {STATUT_LABELS[e.statut] || e.statut}
                    </span>
                  </td>
                  <td className="px-3 py-2">{e.date_bios || '—'}</td>
                </tr>
              ))}
              {equipements.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-6">Aucun équipement enregistré.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modalOuverte && (
        <NouvelEquipementModal
          onClose={() => setModalOuverte(false)}
          onCreated={() => { setModalOuverte(false); charger() }}
        />
      )}
    </div>
  )
}
