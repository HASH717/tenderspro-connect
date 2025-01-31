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
    const { plan, amount, userId } = await req.json()
    
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

    console.log(`Creating payment link for plan: ${plan} with amount: ${amount} for user: ${userId}`)

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    const [profileResponse, userResponse] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', userId).single(),
      supabase.auth.admin.getUserById(userId)
    ])

    if (profileResponse.error) {
      console.error('Profile fetch error:', profileResponse.error)
      throw new Error('Failed to fetch user profile')
    }

    if (userResponse.error) {
      console.error('User fetch error:', userResponse.error)
      throw new Error('Failed to fetch user data')
    }

    const profile = profileResponse.data
    const userEmail = userResponse.data.user.email

    console.log('User profile:', profile)
    console.log('User email:', userEmail)

    // Ensure amount is a valid integer for Chargily Pay (minimum 1000 DZD in cents)
    const amountInCents = Math.max(1000, Math.round(amount))
    console.log('Amount in cents:', amountInCents)
    
    const paymentData = {
      name: `${plan} Plan Subscription`,
      items: [{
        name: `${plan} Plan`,
        price: amountInCents,
        quantity: 1,
        currency: "dzd",
        adjustable_quantity: false
      }],
      locale: "ar",
      pass_fees_to_customer: false,
      collect_shipping_address: false,
      metadata: {
        plan,
        user_id: userId
      },
      after_completion_message: "Thank you for subscribing to our service.",
      active: 1
    }

    console.log('Payment request data:', paymentData)

    const response = await fetch('https://pay.chargily.net/test/api/v2/payment-links', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHARGILY_PAY_SECRET_KEY}`,
      },
      body: JSON.stringify(paymentData)
    })

    console.log('Chargily API response status:', response.status)
    const responseData = await response.json()
    console.log('Chargily API response:', responseData)

    if (!response.ok) {
      throw new Error(`Chargily Pay API error: ${JSON.stringify(responseData)}`)
    }

    return new Response(
      JSON.stringify({ 
        paymentUrl: responseData.url,
        message: 'Payment link created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating payment link:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})