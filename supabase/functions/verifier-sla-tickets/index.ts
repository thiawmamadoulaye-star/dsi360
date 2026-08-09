// DSI 360 — Edge Function planifiée : vérification des SLA dépassés
// Appelle la fonction Postgres fn_verifier_sla_echus() qui escalade
// automatiquement les tickets dont l'échéance SLA est dépassée.
//
// Planification recommandée : toutes les 15 minutes.
//   - Supabase Scheduled Functions (si disponible sur votre plan), ou
//   - Un déclencheur externe (cron Netlify / GitHub Actions) qui appelle
//     cette URL via POST toutes les 15 minutes.
//
// Déploiement : supabase functions deploy verifier-sla-tickets

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (_req) => {
  const { data, error } = await supabaseAdmin.rpc('fn_verifier_sla_echus')

  if (error) {
    console.error('Erreur vérification SLA :', error.message)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }

  return new Response(
    JSON.stringify({ tickets_escalades: data }),
    { status: 200, headers: { 'Content-Type': 'application/json' } }
  )
})
