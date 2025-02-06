import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface PaymentLinkItem {
  entity: string
  amount: number
  quantity: number
  adjustable_quantity?: boolean
  currency?: string
  metadata?: Record<string, any>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // Get auth user
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser(req.headers.get('Authorization')?.split(' ')[1] ?? '')

    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { name, description, items } = await req.json()

    // Create payment link in Chargily Pay
    const chargilyResponse = await fetch('https://pay.chargily.net/api/v2/payment-links', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('CHARGILY_PAY_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        description,
        items,
      }),
    })

    if (!chargilyResponse.ok) {
      throw new Error(`Chargily API error: ${chargilyResponse.statusText}`)
    }

    const chargilyData = await chargilyResponse.json()

    // Store payment link in database
    const { data: paymentLink, error: insertError } = await supabaseClient
      .from('payment_links')
      .insert({
        chargily_id: chargilyData.id,
        user_id: user.id,
        name,
        description,
      })
      .select()
      .single()

    if (insertError) {
      throw new Error(`Database error: ${insertError.message}`)
    }

    // Store payment link items
    const itemsToInsert = items.map((item: PaymentLinkItem) => ({
      payment_link_id: paymentLink.id,
      ...item,
    }))

    const { error: itemsError } = await supabaseClient
      .from('payment_link_items')
      .insert(itemsToInsert)

    if (itemsError) {
      throw new Error(`Database error: ${itemsError.message}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: { 
          ...paymentLink,
          chargily_data: chargilyData 
        } 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})
