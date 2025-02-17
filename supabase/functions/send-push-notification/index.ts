
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

interface WebPushPayload {
  notification: {
    title: string;
    body: string;
    data?: Record<string, string>;
  };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { tender_id, alert_id, user_id } = await req.json();
    console.log('Received push notification request:', { tender_id, alert_id, user_id });

    // Fetch the tender details
    const { data: tender, error: tenderError } = await supabaseAdmin
      .from('tenders')
      .select('*')
      .eq('id', tender_id)
      .single();

    if (tenderError) {
      console.error('Error fetching tender:', tenderError);
      throw tenderError;
    }
    console.log('Fetched tender:', tender);

    // Fetch the alert details
    const { data: alert, error: alertError } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (alertError) {
      console.error('Error fetching alert:', alertError);
      throw alertError;
    }
    console.log('Fetched alert:', alert);

    // Fetch user's push tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('user_push_tokens')
      .select('push_token, device_type')
      .eq('user_id', user_id);

    if (tokensError) {
      console.error('Error fetching push tokens:', tokensError);
      throw tokensError;
    }
    console.log('Found push tokens:', tokens);

    if (!tokens || tokens.length === 0) {
      console.log('No push tokens found for user:', user_id);
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json' 
          } 
        }
      );
    }

    // Prepare notification payload
    const payload: WebPushPayload = {
      notification: {
        title: "New Tender Match!",
        body: `A new tender matching your alert "${alert.name}": ${tender.title}`,
        data: {
          tenderId: tender_id,
          alertId: alert_id
        }
      }
    };
    console.log('Prepared notification payload:', payload);

    // Send push notification to each token
    const sendPromises = tokens.map(async ({ push_token }) => {
      console.log('Sending push notification to token:', push_token);
      
      const fcmPayload = {
        to: push_token,
        priority: 'high',
        content_available: true,
        ...payload,
      };
      console.log('FCM payload:', fcmPayload);

      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(fcmPayload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error('FCM API error:', errorText);
        throw new Error(`Failed to send push notification: ${errorText}`);
      }

      const responseData = await res.json();
      console.log('FCM API response:', responseData);
      return responseData;
    });

    const results = await Promise.all(sendPromises);
    console.log('All push notifications sent:', results);

    return new Response(
      JSON.stringify({ message: 'Push notifications sent successfully', results }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error in send-push-notification function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});
