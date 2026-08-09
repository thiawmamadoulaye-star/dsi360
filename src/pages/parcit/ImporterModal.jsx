// DSI 360 — ParcIT : import d'équipements depuis un fichier CSV
import React, { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../contexts/AuthContext'
import { csvVersEquipements } from './csvUtils'

export default function ImporterModal({ onClose, onImported }) {
  const { tenantId, profile } = useAuth()
  const [lignes, setLignes] = useState([])
  const [nomFichier, setNomFichier] = useState('')
  const [enCours, setEnCours] = useState(false)
  const [resultat, setResultat] = useState(null)
  const [erreur, setErreur] = useState('')

  function handleFichier(e) {
    const fichier = e.target.files?.[0]
    if (!fichier) return
    setNomFichier(fichier.name)
    setErreur('')
    setResultat(null)
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const objets = csvVersEquipements(ev.target.result)
        setLignes(objets)
        if (objets.length === 0) setErreur("Aucune ligne exploitable détectée. Vérifiez les en-têtes de colonnes du fichier.")
      } catch (err) {
        setErreur("Impossible de lire ce fichier : " + err.message)
      }
    }
    reader.readAsText(fichier, 'UTF-8')
  }

  async function confirmerImport() {
    setEnCours(true)
    setErreur('')
    const payload = lignes.map((l) => ({ ...l, tenant_id: tenantId, created_by: profile?.id }))

    let succes = 0
    const taillePaquet = 100
    for (let i = 0; i < payload.length; i += taillePaquet) {
      const paquet = payload.slice(i, i + taillePaquet)
      const { error } = await supabase.from('cmdb_equipements').insert(paquet)
      if (error) {
        setErreur(`Erreur lors de l'import (ligne ~${i + 1}) : ${error.message}`)
        setEnCours(false)
        setResultat({ succes, total: payload.length })
        return
      }
      succes += paquet.length
    }

    setEnCours(false)
    setResultat({ succes, total: payload.length })
    onImported()
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-navy-900 mb-2">Importer des équipements</h2>
        <p className="text-sm text-gray-500 mb-4">
          Fichier CSV (séparateur virgule ou point-virgule). Colonnes reconnues : Code actif, Type, Marque, Modèle,
          N° série, Processeur, RAM, OS, Version OS, Localisation, Statut, Date d'acquisition, Date BIOS, Coût, Utilisateur.
        </p>

        <input type="file" accept=".csv" onChange={handleFichier} className="mb-4" />

        {erreur && <p className="text-sm text-red-600 mb-3">{erreur}</p>}

        {lignes.length > 0 && !resultat && (
          <div className="mb-4">
            <p className="text-sm font-medium text-navy-900 mb-2">{lignes.length} ligne(s) détectée(s) dans « {nomFichier} »</p>
            <div className="overflow-x-auto border rounded">
              <table className="w-full text-xs">
                <thead className="bg-navy-50">
                  <tr>
                    <th className="text-left px-2 py-1">Code actif</th>
                    <th className="text-left px-2 py-1">Type</th>
                    <th className="text-left px-2 py-1">Marque</th>
                    <th className="text-left px-2 py-1">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {lignes.slice(0, 5).map((l, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-2 py-1">{l.code_actif || '—'}</td>
                      <td className="px-2 py-1">{l.type_equipement || '—'}</td>
                      <td className="px-2 py-1">{l.marque || '—'}</td>
                      <td className="px-2 py-1">{l.statut || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {lignes.length > 5 && <p className="text-xs text-gray-400 p-2">… et {lignes.length - 5} autre(s) ligne(s)</p>}
            </div>
          </div>
        )}

        {resultat && (
          <p className="text-sm mb-4 text-navy-700">
            {resultat.succes} / {resultat.total} équipement(s) importé(s) avec succès.
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className="px-4 py-2 text-sm border rounded">
            {resultat ? 'Fermer' : 'Annuler'}
          </button>
          {lignes.length > 0 && !resultat && (
            <button onClick={confirmerImport} disabled={enCours} className="px-4 py-2 text-sm bg-navy-900 text-white rounded disabled:opacity-60">
              {enCours ? 'Import en cours…' : `Importer ${lignes.length} équipement(s)`}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
