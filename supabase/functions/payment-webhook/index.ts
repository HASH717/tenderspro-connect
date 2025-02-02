import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { corsHeaders } from '../_shared/cors.ts'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey)

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const payload = await req.json()
    console.log('Received webhook payload:', JSON.stringify(payload, null, 2))

    // Extract the event data
    const data = payload.data
    if (!data) {
      throw new Error('No data in webhook payload')
    }

    // Verify payment status - only proceed if payment is successful
    if (data.status === 'paid' && data.payment_status === 'completed') {
      console.log('Processing successful payment:', data)
      
      // Extract metadata
      const metadata = data.metadata
      if (!metadata) {
        throw new Error('No metadata in checkout data')
      }

      const userId = metadata.user_id
      const planName = metadata.plan
      const email = metadata.email

      if (!userId || !planName) {
        console.error('Missing required metadata:', metadata)
        throw new Error('Missing required metadata (user_id or plan)')
      }

      console.log('Extracted data:', { userId, planName, email })

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

      // Update or create subscription
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
    } else {
      console.log('Payment not successful or incomplete:', data)
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Payment not successful or incomplete'
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

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