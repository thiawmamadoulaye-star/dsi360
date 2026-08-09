// DSI 360 — ParcIT : page Paramètres (masquée au rôle Technicien via routing + RLS)
import React, { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'

const CLE_SEUIL = 'obsolescence_bios_seuil_annees'
const CLE_COLONNES = 'colonnes_parc_it'

export default function Parametres() {
  const { tenantId } = useAuth()
  const [seuilAnnees, setSeuilAnnees] = useState(5)
  const [colonnes, setColonnes] = useState([])

  useEffect(() => {
    if (!tenantId) return
    async function load() {
      const { data } = await supabase
        .from('parametres_tenant')
        .select('cle, valeur')
        .eq('tenant_id', tenantId)
        .in('cle', [CLE_SEUIL, CLE_COLONNES])
      data?.forEach((p) => {
        if (p.cle === CLE_SEUIL) setSeuilAnnees(p.valeur)
        if (p.cle === CLE_COLONNES) setColonnes(p.valeur)
      })
    }
    load()
  }, [tenantId])

  async function enregistrerSeuil() {
    await supabase.from('parametres_tenant').upsert(
      { tenant_id: tenantId, cle: CLE_SEUIL, valeur: seuilAnnees },
      { onConflict: 'tenant_id,cle' }
    )
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-navy-900 mb-4">Paramètres — ParcIT</h1>

      <div className="bg-white rounded-lg shadow-card p-4 max-w-md">
        <label className="block text-sm text-gray-700 mb-1">
          Seuil d'obsolescence (âge du BIOS, en années)
        </label>
        <div className="flex gap-2">
          <input
            type="number"
            value={seuilAnnees}
            onChange={(e) => setSeuilAnnees(Number(e.target.value))}
            className="border rounded px-3 py-2 w-24"
          />
          <button
            onClick={enregistrerSeuil}
            className="bg-navy-900 text-white rounded px-4 py-2 text-sm"
          >
            Enregistrer
          </button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Un équipement dont la date BIOS dépasse ce seuil est marqué « obsolète »
          automatiquement (calcul côté vue/serveur).
        </p>
      </div>

      {/* Colonnes affichables : réutiliser le composant DataTable paramétrable existant de ParcIT */}
    </div>
  )
}
