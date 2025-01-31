import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const chargilySecretKey = Deno.env.get('CHARGILY_PAY_SECRET_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify Chargily signature
    const signature = req.headers.get('signature')
    if (!signature) {
      throw new Error('No signature found')
    }

    // Parse the webhook payload
    const payload = await req.json()
    console.log('Received webhook payload:', payload)

    const event = payload.event

    // Handle different event types
    if (event.type === 'checkout.paid') {
      const checkout = event.data
      console.log('Checkout data:', checkout)
      
      // Map product names to plan names
      const productNameToPlan = {
        'TendersPro Basic': 'basic',
        'TendersPro Professional': 'professional',
        'TendersPro Enterprise': 'enterprise'
      }

      const planName = productNameToPlan[checkout.items[0].name]
      if (!planName) {
        console.error('Invalid plan name:', checkout.items[0].name)
        throw new Error('Invalid plan name')
      }

      // Extract user_id from metadata
      const userId = checkout.metadata?.user_id
      if (!userId) {
        console.error('No user_id found in metadata:', checkout.metadata)
        throw new Error('No user_id found in metadata')
      }

      // Calculate subscription period
      const now = new Date()
      const currentPeriodStart = now
      let currentPeriodEnd = new Date(now)
      
      // Add 7 days for trial period, then add a month
      currentPeriodEnd.setDate(currentPeriodEnd.getDate() + 7) // 7 days trial
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // 1 month subscription

      console.log('Creating subscription:', {
        user_id: userId,
        plan: planName,
        period: {
          start: currentPeriodStart.toISOString(),
          end: currentPeriodEnd.toISOString()
        }
      })

      // Update or create subscription
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan: planName,
          status: 'active',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString()
        }, {
          onConflict: 'user_id'
        })
        .select()
        .single()

      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError)
        throw subscriptionError
      }

      console.log('Successfully updated subscription for user:', userId)

      // Redirect URL after successful payment
      const redirectUrl = new URL(checkout.success_url)
      redirectUrl.searchParams.append('status', 'success')
      
      return new Response(
        JSON.stringify({ 
          success: true,
          redirect_url: redirectUrl.toString()
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({ success: true }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )

  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    )
  }
})