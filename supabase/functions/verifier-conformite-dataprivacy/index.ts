// DSI 360 — Edge Function planifiée : vérification des échéances Data Privacy
// Appelle fn_verifier_echeances_conformite() qui alerte :
//  - les violations dont l'échéance de notification CDP (72h) approche (<24h)
//  - les actions du plan de conformité dont l'échéance approche (<7 jours)
//
// Planification recommandée : toutes les heures.
// Déploiement : supabase functions deploy verifier-conformite-dataprivacy

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (_req) => {
  const { data, error } = await supabaseAdmin.rpc('fn_verifier_echeances_conformite')

  if (error) {
    console.error('Erreur vérification conformité :', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
