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
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Parse the webhook payload
    const payload = await req.json()
    console.log('Received webhook payload:', payload)

    const event = payload.event

    // Handle different event types
    if (event.type === 'checkout.paid') {
      const checkout = event.data
      console.log('Processing paid checkout:', checkout)
      
      // Extract user_id and plan from metadata
      const userId = checkout.metadata?.user_id
      const planName = checkout.metadata?.plan

      if (!userId || !planName) {
        console.error('Missing user_id or plan in metadata:', checkout.metadata)
        throw new Error('Missing required metadata')
      }

      // Calculate subscription period
      const now = new Date()
      const currentPeriodStart = now
      const currentPeriodEnd = new Date(now)
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1) // 1 month subscription

      console.log('Creating/updating subscription:', {
        user_id: userId,
        plan: planName,
        period: {
          start: currentPeriodStart.toISOString(),
          end: currentPeriodEnd.toISOString()
        }
      })

      // Update or create subscription using upsert
      const { data: subscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: userId,
          plan: planName,
          status: 'active',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single()

      if (subscriptionError) {
        console.error('Error updating subscription:', subscriptionError)
        throw subscriptionError
      }

      console.log('Successfully updated subscription:', subscription)

      // Return success response with subscription data
      return new Response(
        JSON.stringify({ 
          success: true,
          subscription,
          message: 'Subscription updated successfully'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    // Return success response for other event types
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