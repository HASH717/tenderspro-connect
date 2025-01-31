import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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
    const { plan, amount } = await req.json()
    
    // Get environment variables
    const CHARGILY_PAY_SECRET_KEY = Deno.env.get('CHARGILY_PAY_SECRET_KEY')
    const CHARGILY_PAY_PUBLIC_KEY = Deno.env.get('CHARGILY_PAY_PUBLIC_KEY')

    if (!CHARGILY_PAY_SECRET_KEY || !CHARGILY_PAY_PUBLIC_KEY) {
      throw new Error('Chargily Pay credentials not configured')
    }

    console.log(`Creating subscription for plan: ${plan} with amount: ${amount}`)

    // Create payment request to Chargily Pay
    const response = await fetch('https://pay.chargily.net/api/v2/payment-links', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${CHARGILY_PAY_SECRET_KEY}`,
      },
      body: JSON.stringify({
        amount: amount, // Amount in DZD
        currency: 'DZD',
        description: `Subscription to ${plan} Plan`,
        webhook_url: 'https://your-domain.com/webhook', // You'll need to update this
        back_url: 'https://your-domain.com/payment-success', // You'll need to update this
        mode: 'CIB', // CIB/EDAHABIA
        customer: {
          name: 'Customer', // We can add user details later
          email: 'customer@example.com', // We can add user email later
          phone: '213xxxxxxxxx' // We can add user phone later
        },
        metadata: {
          plan: plan,
          user_id: 'user_id' // We can add actual user ID later
        }
      })
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Chargily Pay API error:', errorData)
      throw new Error('Failed to create payment link')
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