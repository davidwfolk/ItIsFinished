import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

serve(async (req) => {
  // 1. Initialize Supabase Admin Client to bypass RLS for the state callback
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  try {
    // 2. Parse the Database Webhook Payload
    const payload = await req.json()
    const invite = payload.record // The newly inserted row from workspace_invites

    if (payload.type !== 'INSERT' || !invite) {
      return new Response('Not an insert event', { status: 400 })
    }

    // 3. Send Email via External API (Resend)
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'invites@itisfinishedapp.com',
        to: invite.email,
        subject: 'You have been invited to a workspace',
        html: `<p>You have been invited to join a workspace! Click <a href="https://itisfinishedapp.com/invite?token=${invite.token}">here</a> to join.</p>`
      })
    });

    if (!res.ok) {
      throw new Error(`Resend API error: ${await res.text()}`)
    }

    // 4. State Machine Callback: Update to 'sent' closing the Realtime feedback loop
    await supabaseAdmin
      .from('workspace_invites')
      .update({ email_status: 'sent' })
      .eq('id', invite.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error(error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
