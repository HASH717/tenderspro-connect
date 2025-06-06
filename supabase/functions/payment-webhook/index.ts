
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

    const data = payload.data
    if (!data) {
      throw new Error('No data in webhook payload')
    }

    console.log('Payment status details:', {
      status: data.status,
      payment_status: data.payment_status,
      metadata: data.metadata
    })

    if (data.status !== 'paid') {
      console.log('Payment not successful:', {
        id: data.id,
        fees: data.fees,
        amount: data.amount,
        status: data.status
      })
      return new Response(
        JSON.stringify({ 
          success: false,
          message: 'Payment not successful or incomplete',
          status: data.status,
          payment_status: data.payment_status
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      )
    }

    console.log('Processing successful payment:', data)
    
    const metadata = data.metadata
    if (!metadata) {
      throw new Error('No metadata in checkout data')
    }

    const userId = metadata.user_id
    const planName = metadata.plan
    const categories = metadata.categories
    const billingInterval = metadata.billing_interval || 'monthly'

    if (!userId || !planName) {
      console.error('Missing required metadata:', metadata)
      throw new Error('Missing required metadata (user_id or plan)')
    }

    console.log('Extracted data:', { userId, planName, categories, billingInterval })

    // First, deactivate any existing subscriptions
    const { error: deactivateError } = await supabase
      .from('subscriptions')
      .update({ status: 'inactive' })
      .eq('user_id', userId)
      .neq('status', 'inactive')

    if (deactivateError) {
      console.error('Error deactivating subscriptions:', deactivateError)
      throw new Error(`Failed to deactivate subscriptions: ${deactivateError.message}`)
    }

    // Calculate subscription period
    const now = new Date()
    const currentPeriodStart = now
    const currentPeriodEnd = new Date(now)
    if (billingInterval === 'annual') {
      currentPeriodEnd.setFullYear(currentPeriodEnd.getFullYear() + 1)
    } else {
      currentPeriodEnd.setMonth(currentPeriodEnd.getMonth() + 1)
    }

    // Create new subscription with retries
    let subscription
    let retries = 3
    while (retries > 0) {
      const { data: newSubscription, error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({
          user_id: userId,
          plan: planName,
          status: 'active',
          current_period_start: currentPeriodStart.toISOString(),
          current_period_end: currentPeriodEnd.toISOString(),
          billing_interval: billingInterval
        })
        .select()
        .single()

      if (!subscriptionError) {
        subscription = newSubscription
        break
      }

      console.error(`Attempt ${4 - retries} failed:`, subscriptionError)
      retries--
      if (retries === 0) {
        throw subscriptionError
      }
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    console.log('Successfully created subscription:', subscription)

    return new Response(
      JSON.stringify({ 
        success: true,
        subscription,
        message: 'Subscription created successfully'
      }),
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
