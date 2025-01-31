import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { plan, amount, userId } = await req.json()
    
    // Get environment variables
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

    // Initialize Supabase client with service role key
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

    // Get user profile and auth information
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

    console.log(`Creating subscription for plan: ${plan} with amount: ${amount} for user: ${userId}`)

    // Create payment request to Chargily Pay
    const paymentData = {
      amount: amount, // Amount in DZD
      currency: 'DZD',
      description: `Subscription to ${plan} Plan`,
      webhook_url: `${SUPABASE_URL}/functions/v1/payment-webhook`, // Webhook endpoint
      back_url: 'https://dztenders.com/payment-success', // Success page URL
      mode: 'CIB', // CIB/EDAHABIA
      customer: {
        name: `${profile.first_name} ${profile.last_name}`,
        email: userEmail,
        phone: profile.phone_number || '213xxxxxxxxx'
      },
      metadata: {
        plan: plan,
        user_id: userId
      }
    }

    console.log('Payment request data:', paymentData)

    const response = await fetch('https://pay.chargily.net/api/v2/payment-links', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CHARGILY_PAY_SECRET_KEY}`, // Changed from X-Authorization to Authorization
      },
      body: JSON.stringify(paymentData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Chargily Pay API error:', errorData)
      throw new Error(`Chargily Pay API error: ${JSON.stringify(errorData)}`)
    }

    const data = await response.json()
    console.log('Payment link created:', data)

    return new Response(
      JSON.stringify({ 
        paymentUrl: data.checkout_url,
        message: 'Payment link created successfully'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    console.error('Error creating subscription:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})