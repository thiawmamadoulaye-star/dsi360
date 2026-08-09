// DSI 360 — ParcIT : configuration des colonnes affichables (paramétrable par tenant)
export const COLONNES_DISPONIBLES = [
  { cle: 'code_actif', label: 'Nom / Code actif', parDefaut: true },
  { cle: 'statut', label: 'Statut', parDefaut: true },
  { cle: 'utilisateur', label: 'Utilisateur', parDefaut: true },
  { cle: 'localisation', label: 'Localité', parDefaut: true },
  { cle: 'age_ans', label: 'Âge (ans)', parDefaut: true },
  { cle: 'marque', label: 'Fabricant', parDefaut: true },
  { cle: 'type_equipement', label: 'Type', parDefaut: true },
  { cle: 'modele', label: 'Modèle', parDefaut: true },
  { cle: 'os_complet', label: "Système d'exploitation", parDefaut: true },
  { cle: 'numero_serie', label: 'N° série', parDefaut: false },
  { cle: 'ram_go', label: 'RAM (Go)', parDefaut: false },
  { cle: 'processeur', label: 'Processeur', parDefaut: false },
  { cle: 'date_acquisition', label: "Date d'acquisition", parDefaut: false },
  { cle: 'date_bios', label: 'Date BIOS', parDefaut: false },
  { cle: 'cout_acquisition', label: "Coût d'acquisition", parDefaut: false },
]

export const CLE_PARAMETRE_COLONNES = 'colonnes_parc_it'
