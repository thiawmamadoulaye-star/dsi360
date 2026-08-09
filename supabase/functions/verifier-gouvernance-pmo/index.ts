// DSI 360 — Edge Function planifiée : vérification des alertes Gouvernance IT & PMO
// Appelle fn_verifier_alertes_gouvernance() qui détecte :
//  - les jalons de projet en retard
//  - les projets en dépassement budgétaire (coût réel > budget CAPEX+OPEX)
//  - les contrats fournisseurs arrivant à échéance (< 60 jours) ou expirés
//
// Planification recommandée : quotidienne (ex. 7h du matin).
// Déploiement : supabase functions deploy verifier-gouvernance-pmo

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (_req) => {
  const { data, error } = await supabaseAdmin.rpc('fn_verifier_alertes_gouvernance')

  if (error) {
    console.error('Erreur vérification gouvernance/PMO :', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
