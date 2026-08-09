// DSI 360 — ParcIT : constantes partagées (statuts, types, couleurs, calcul d'âge)
export const STATUTS = [
  { value: 'en_service', label: 'En service' },
  { value: 'en_cours_utilisation', label: "En cours d'utilisation" },
  { value: 'en_stock', label: 'En stock' },
  { value: 'en_maintenance', label: 'En maintenance' },
  { value: 'obsolete', label: 'Obsolète' },
  { value: 'reforme', label: 'Réformé' },
  { value: 'perdu_vole', label: 'Perdu / Volé' },
]

export const STATUT_LABELS = Object.fromEntries(STATUTS.map((s) => [s.value, s.label]))

export const STATUT_COULEURS = {
  en_service: 'bg-green-100 text-green-800',
  en_cours_utilisation: 'bg-blue-100 text-blue-800',
  en_stock: 'bg-gray-100 text-gray-700',
  en_maintenance: 'bg-amber-100 text-amber-800',
  obsolete: 'bg-red-100 text-red-800',
  reforme: 'bg-gray-200 text-gray-600',
  perdu_vole: 'bg-red-200 text-red-900',
}

export const TYPES_EQUIPEMENT = ['PC portable', 'PC bureau', 'Serveur', 'Switch', 'Routeur', 'Imprimante', 'Mobile', 'Tablette', 'Écran', 'Autre']

export function calculerAgeAns(dateBios) {
  if (!dateBios) return null
  const d = new Date(dateBios)
  if (isNaN(d.getTime())) return null
  const diffMs = Date.now() - d.getTime()
  return Math.round((diffMs / (1000 * 60 * 60 * 24 * 365.25)) * 10) / 10
}
