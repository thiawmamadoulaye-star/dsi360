// DSI 360 — Client Supabase partagé par tous les modules (Phase 1)
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  // Évite un crash silencieux en développement si les variables .env manquent
  console.warn(
    'DSI 360 : VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY manquantes. ' +
    'Configurez votre fichier .env (voir guide de déploiement).'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
})

/**
 * Récupère le profil DSI 360 (tenant_id, rôle, droits) de l'utilisateur connecté.
 * Le profil est créé automatiquement à l'inscription via un trigger Supabase
 * (handle_new_user) qui rattache l'utilisateur au tenant correspondant à son
 * invitation.
 */
export async function fetchCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data, error } = await supabase
    .from('profiles')
    .select('*, tenants(nom, couleur_primaire, couleur_secondaire, logo_url)')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Erreur de chargement du profil DSI 360 :', error.message)
    return null
  }
  return data
}

/** Raccourci pour vérifier si un rôle est celui d'un administrateur du tenant */
export function isTenantAdmin(role) {
  return role === 'dsi' || role === 'super_admin'
}
