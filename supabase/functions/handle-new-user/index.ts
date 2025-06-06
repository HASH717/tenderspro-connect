import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

serve(async (req) => {
  try {
    const payload = await req.json()
    const { record: user } = payload

    console.log('Processing new user:', user.id)

    // Create profile only
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        first_name: user.raw_user_meta_data?.first_name,
        last_name: user.raw_user_meta_data?.last_name,
        phone_number: user.raw_user_meta_data?.phone_number
      })

    if (profileError) {
      console.error('Error creating profile:', profileError)
      throw profileError
    }

    console.log('Successfully created profile for user:', user.id)

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error) {
    console.error('Error in handle-new-user function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})