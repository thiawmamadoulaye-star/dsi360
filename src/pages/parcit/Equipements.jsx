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
  en_cours_
