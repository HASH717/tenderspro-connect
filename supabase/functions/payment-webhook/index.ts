import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import * as crypto from "https://deno.land/std@0.168.0/crypto/mod.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, signature',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const CHARGILY_PAY_SECRET_KEY = Deno.env.get('CHARGILY_PAY_SECRET_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!CHARGILY_PAY_SECRET_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Missing required environment variables')
    }

    // Initialize Supabase client with service role key for admin access
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get the signature from headers
    const signature = req.headers.get('signature')
    if (!signature) {
      throw new Error('No signature found in request headers')
    }

    // Get the raw payload
    const payload = await req.text()
    console.log('Received webhook payload:', payload)

    // Calculate HMAC signature
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(CHARGILY_PAY_SECRET_KEY),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"]
    )
    const signatureBuffer = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(payload)
    )
    const computedSignature = Array.from(new Uint8Array(signatureBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    // Verify signature
    if (signature !== computedSignature) {
      console.error('Invalid signature')
      throw new Error('Invalid signature')
    }

    // Parse the payload
    const event = JSON.parse(payload)
    console.log('Event type:', event.type)

    // Handle different event types
    if (event.type === 'checkout.paid') {
      const checkout = event.data
      const metadata = checkout.metadata || {}
      
      // Map product names to plan names
      const productNameToPlan = {
        'TendersPro Basic': 'basic',
        'TendersPro Professional': 'professional',
        'TendersPro Enterprise': 'enterprise'
      }

      const planName = productNameToPlan[checkout.items[0].name]
      if (!planName) {
        throw new Error('Invalid plan name')
      }

      // Calculate subscription period based on plan
      const now = new Date()
      const currentPeriodStart = now
      let currentPeriodEnd = new Date(now)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)

      // Update or create subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: metadata.user_id,
          plan: planName,
          status: 'active',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
        }, {
          onConflict: 'user_id',
          returning: 'minimal'
        })

      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError)
        throw subscriptionError
      }

      console.log('Successfully updated subscription for user:', metadata.user_id)
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})