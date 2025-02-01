import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { plan, priceId, userId, backUrl, categories } = await req.json()
    
    const CHARGILY_PAY_SECRET_KEY = Deno.env.get('CHARGILY_PAY_SECRET_KEY')
    const CHARGILY_PAY_PUBLIC_KEY = Deno.env.get('CHARGILY_PAY_PUBLIC_KEY')
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!CHARGILY_PAY_SECRET_KEY || !CHARGILY_PAY_PUBLIC_KEY) {
      throw new Error('Chargily Pay credentials not configured')
    }

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('Supabase credentials not configured')
    }

    console.log(`Creating checkout for plan: ${plan} with priceId: ${priceId} for user: ${userId}`)
    console.log('Selected categories:', categories)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // First, insert a new subscription record
    try {
      console.log('Creating new subscription...')
      const { error: subscriptionError } = await supabase
        .from('subscriptions')
        .insert({ 
          user_id: userId,
          plan: plan,
          status: 'active',
          current_period_start: new Date().toISOString(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days
        })

      if (subscriptionError) {
        console.error('Error creating subscription:', subscriptionError)
        throw new Error(`Failed to create subscription: ${subscriptionError.message}`)
      }
      
      // Add a small delay to allow the trigger to process
      await new Promise(resolve => setTimeout(resolve, 1000))
      
    } catch (error) {
      console.error('Subscription creation error:', error)
      return new Response(
        JSON.stringify({ error: `Failed to create subscription: ${error.message}` }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      )
    }

    // Then update categories if provided
    if (categories && Array.isArray(categories)) {
      try {
        console.log('Updating categories...')
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ preferred_categories: categories })
          .eq('id', userId)

        if (updateError) {
          console.error('Error updating categories:', updateError)
          throw new Error(`Failed to update categories: ${updateError.message}`)
        }
      } catch (error) {
        console.error('Categories update error:', error)
        return new Response(
          JSON.stringify({ error: `Failed to update categories: ${error.message}` }),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400 
          }
        )
      }
    }

    // Using test amounts for development
    const planPrices = {
      'Basic': 1000, // 10 DZD
      'Professional': 2000, // 20 DZD
      'Enterprise': 10000 // 100 DZD
    }

    // Use a public-facing webhook URL
    const webhookUrl = 'https://achevndenwxikpbabzop.functions.supabase.co/payment-webhook'
    console.log('Webhook URL:', webhookUrl)

    // Create checkout data according to Chargily Pay API specs
    const checkoutData = {
      amount: planPrices[plan],
      currency: "dzd",
      payment_method: "edahabia",
      success_url: `${backUrl}?success=true&plan=${plan}`,
      webhook_endpoint: webhookUrl,
      metadata: {
        plan,
        user_id: userId,
        categories: categories || []
      }
    }

    console.log('Creating checkout with data:', checkoutData)

    const response = await fetch('https://pay.chargily.net/test/api/v2/checkouts', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHARGILY_PAY_SECRET_KEY}`,
      },
      body: JSON.stringify(checkoutData)
    })

    console.log('Chargily API response status:', response.status)
    const responseData = await response.json()
    console.log('Chargily API response:', responseData)

    if (!response.ok) {
      throw new Error(`Chargily Pay API error: ${JSON.stringify(responseData)}`)
    }

    return new Response(
      JSON.stringify({ 
        checkoutUrl: responseData.checkout_url,
        message: 'Checkout created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating checkout:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})