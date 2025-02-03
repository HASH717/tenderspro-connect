import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
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

    // Validate required fields and API keys
    if (!plan || !priceId || !userId || !backUrl) {
      console.error('Missing required fields:', { plan, priceId, userId, backUrl })
      throw new Error('Missing required fields')
    }

    if (!chargilyPaySecretKey) {
      console.error('Missing Chargily API key')
      throw new Error('Configuration error: Missing API key')
    }

    console.log('Creating payment request with:', { plan, priceId, userId, backUrl })

    // Format webhook URL correctly
    const webhookUrl = new URL('/api/payment-webhook', backUrl).toString()
    console.log('Webhook URL:', webhookUrl)

    // Create payment request
    try {
      const response = await fetch('https://pay.chargily.net/api/v2/payments', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'X-Authorization': chargilyPaySecretKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          client: userId,
          amount: priceId === '01jjynsfaqmh26p7738may84eq' ? 1000 : 
                  priceId === '01jjyntr26nrbx34t2s9kq6mn4' ? 2000 : 10000,
          invoice_number: `SUB-${Date.now()}`,
          back_url: backUrl,
          webhook_url: webhookUrl,
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
      console.log('Chargily response:', data)

      if (!response.ok) {
        console.error('Chargily error:', data)
        throw new Error(data.message || 'Failed to create payment')
      }

      // Customize the failure page URL to include a return button
      const failureUrl = `${data.checkout_url}&custom_failure_page=true&return_url=${encodeURIComponent(backUrl)}`

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
    } catch (fetchError) {
      console.error('Fetch error:', fetchError)
      throw new Error(`Payment request failed: ${fetchError.message}`)
    }
  } catch (error) {
    console.error('Payment creation error:', error)
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