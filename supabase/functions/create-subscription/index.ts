
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
    const { plan, priceId, userId, backUrl, categories, billingInterval } = await req.json()
    
    const CHARGILY_PAY_SECRET_KEY = Deno.env.get('CHARGILY_PAY_SECRET_KEY')
    const CHARGILY_PAY_PUBLIC_KEY = Deno.env.get('CHARGILY_PAY_PUBLIC_KEY')

    if (!CHARGILY_PAY_SECRET_KEY || !CHARGILY_PAY_PUBLIC_KEY) {
      throw new Error('Chargily Pay credentials not configured')
    }

    console.log(`Creating checkout for plan: ${plan} with priceId: ${priceId} for user: ${userId}`)
    console.log('Selected categories:', categories)
    console.log('Billing interval:', billingInterval)

    // Monthly base prices
    const planPrices = {
      'Basic': { monthly: 1000, annual: 12000 },
      'Professional': { monthly: 2000, annual: 24000 },
      'Enterprise': { monthly: 10000, annual: 120000 }
    }

    const webhookUrl = `https://achevndenwxikpbabzop.functions.supabase.co/payment-webhook`
    console.log('Webhook URL:', webhookUrl)

    // Ensure we're using the full URL for success redirect
    const parsedBackUrl = new URL(backUrl)
    const successUrl = `${parsedBackUrl.origin}/subscriptions/categories`
    console.log('Success URL:', successUrl)

    // Calculate amount based on billing interval
    const amount = billingInterval === 'annual' 
      ? Math.round(planPrices[plan].annual * 0.75) // 25% discount on annual plans
      : planPrices[plan].monthly;

    const checkoutData = {
      amount: amount,
      currency: "dzd",
      payment_method: "edahabia",
      success_url: successUrl,
      webhook_endpoint: webhookUrl,
      metadata: {
        plan,
        user_id: userId,
        categories: categories || [],
        billing_interval: billingInterval || 'monthly'
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
