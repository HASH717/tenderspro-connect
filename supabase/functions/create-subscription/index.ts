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

    if (!CHARGILY_PAY_SECRET_KEY || !CHARGILY_PAY_PUBLIC_KEY) {
      throw new Error('Chargily Pay credentials not configured')
    }

    console.log(`Creating checkout for plan: ${plan} with priceId: ${priceId} for user: ${userId}`)
    console.log('Selected categories:', categories)

    // Using test amounts for development
    const planPrices = {
      'Basic': 1000,
      'Professional': 2000,
      'Enterprise': 10000
    }

    // Construct webhook URL
    const webhookUrl = `https://achevndenwxikpbabzop.functions.supabase.co/payment-webhook`
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