import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4"
import { corsHeaders } from "../_shared/cors.ts"

const chargilyPayPublicKey = Deno.env.get('CHARGILY_PAY_PUBLIC_KEY')
const chargilyPaySecretKey = Deno.env.get('CHARGILY_PAY_SECRET_KEY')

interface RequestBody {
  plan: string
  priceId: string
  userId: string
  backUrl: string
  categories: string[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { plan, priceId, userId, backUrl, categories } = await req.json() as RequestBody

    // Validate required fields
    if (!plan || !priceId || !userId || !backUrl) {
      throw new Error('Missing required fields')
    }

    // Create payment request
    const response = await fetch('https://pay.chargily.net/test/api/v2/payments', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'X-Authorization': chargilyPaySecretKey || '',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        client: userId,
        amount: priceId === 'basic' ? 2000 : priceId === 'professional' ? 5000 : 10000,
        invoice_number: `SUB-${Date.now()}`,
        back_url: backUrl,
        webhook_url: `${backUrl}/api/payment-webhook`,
        mode: 'CIB',
        payment_method: ["CIB"],
        currency: "DZD",
        customer: {
          name: "Customer Name",
          email: "customer@email.com",
          phone: "213555555555"
        },
        metadata: {
          userId,
          plan,
          categories
        }
      })
    })

    const data = await response.json()

    if (!response.ok) {
      throw new Error(data.message || 'Failed to create payment')
    }

    // Customize the failure page URL to include a return button
    const failureUrl = `${data.checkout_url}&custom_failure_page=true&return_url=${encodeURIComponent(backUrl.split('/subscriptions')[0])}`

    return new Response(
      JSON.stringify({
        checkoutUrl: failureUrl
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    )
  }
})