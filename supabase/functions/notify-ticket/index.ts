// DSI 360 — Edge Function : envoi d'e-mail lors des événements Helpdesk
// (assignation, escalade, résolution). Déclenchée par un Database Webhook
// Supabase sur la table `notifications` (INSERT) filtré sur type LIKE 'ticket_%'.
//
// Configuration requise (Supabase → Project Settings → Edge Functions → Secrets) :
//   RESEND_API_KEY   : clé API Resend (ou adapter à votre fournisseur SMTP/email)
//   EMAIL_FROM       : adresse d'expédition, ex. "DSI 360 <notifications@al-amana-tech.sn>"
//   APP_BASE_URL     : URL publique de l'application (pour construire le lien)
//
// Déploiement : supabase functions deploy notify-ticket
// Webhook : Database → Webhooks → table "notifications" → INSERT → HTTP POST
//           vers l'URL de cette fonction.

import { serve } from 'https://deno.land/std@0.192.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') || 'DSI 360 <notifications@al-amana-tech.sn>'
const APP_BASE_URL = Deno.env.get('APP_BASE_URL') || 'https://dsi360.al-amana-tech.sn'
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

serve(async (req) => {
  try {
    const payload = await req.json()
    const notif = payload.record // ligne insérée dans `notifications`

    if (!notif || !String(notif.type || '').startsWith('ticket_')) {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    // Récupère l'e-mail du destinataire
    const { data: destinataire, error } = await supabaseAdmin
      .from('profiles')
      .select('email, nom, prenom')
      .eq('id', notif.user_id)
      .single()

    if (error || !destinataire?.email) {
      return new Response(JSON.stringify({ error: 'Destinataire introuvable' }), { status: 200 })
    }

    const lienComplet = `${APP_BASE_URL}${notif.lien || ''}`

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to: destinataire.email,
        subject: notif.titre,
        html: `
          <p>Bonjour ${destinataire.prenom || ''},</p>
          <p>${notif.message || ''}</p>
          <p><a href="${lienComplet}">Voir le ticket dans DSI 360</a></p>
          <p style="color:#888;font-size:12px;">DSI 360 — AL_AMANA_TECH_SECURITE — Notification automatique</p>
        `,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('Erreur envoi email:', errText)
      return new Response(JSON.stringify({ error: errText }), { status: 200 })
    }

    return new Response(JSON.stringify({ sent: true }), { status: 200 })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 200 })
  }
})
