
import { createClient } from '@supabase/supabase-js';

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
  try {
    const { tender_id, alert_id, user_id } = await req.json();

    // Fetch the tender details
    const { data: tender, error: tenderError } = await supabaseAdmin
      .from('tenders')
      .select('*')
      .eq('id', tender_id)
      .single();

    if (tenderError) throw tenderError;

    // Fetch the alert details
    const { data: alert, error: alertError } = await supabaseAdmin
      .from('alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (alertError) throw alertError;

    // Fetch user's push tokens
    const { data: tokens, error: tokensError } = await supabaseAdmin
      .from('user_push_tokens')
      .select('push_token, device_type')
      .eq('user_id', user_id);

    if (tokensError) throw tokensError;

    if (!tokens || tokens.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No push tokens found for user' }),
        { headers: { 'Content-Type': 'application/json' } }
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

    // Send push notification to each token
    const sendPromises = tokens.map(async ({ push_token }) => {
      const res = await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Authorization': `key=${Deno.env.get('FCM_SERVER_KEY')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: push_token,
          ...payload,
        }),
      });

      if (!res.ok) {
        throw new Error(`Failed to send push notification: ${await res.text()}`);
      }

      return res.json();
    });

    await Promise.all(sendPromises);

    return new Response(
      JSON.stringify({ message: 'Push notifications sent successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
