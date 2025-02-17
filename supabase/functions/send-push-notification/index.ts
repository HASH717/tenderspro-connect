
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
  message: {
    token: string;
    notification: {
      title: string;
      body: string;
    };
    data?: Record<string, string>;
  };
}

async function getAccessToken() {
  try {
    const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}');
    
    // Generate JWT
    const now = Math.floor(Date.now() / 1000);
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: serviceAccount.private_key_id
    };
    
    const claim = {
      iss: serviceAccount.client_email,
      sub: serviceAccount.client_email,
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
      scope: 'https://www.googleapis.com/auth/firebase.messaging'
    };

    const headerB64 = btoa(JSON.stringify(header));
    const claimB64 = btoa(JSON.stringify(claim));
    
    const key = serviceAccount.private_key;
    const textEncoder = new TextEncoder();
    const signatureInput = textEncoder.encode(`${headerB64}.${claimB64}`);
    const cryptoKey = await crypto.subtle.importKey(
      'pkcs8',
      new TextEncoder().encode(key),
      {
        name: 'RSASSA-PKCS1-v1_5',
        hash: 'SHA-256',
      },
      false,
      ['sign']
    );
    const signature = await crypto.subtle.sign(
      'RSASSA-PKCS1-v1_5',
      cryptoKey,
      signatureInput
    );
    const jwt = `${headerB64}.${claimB64}.${btoa(String.fromCharCode(...new Uint8Array(signature)))}`;

    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion: jwt,
      }),
    });

    const { access_token } = await tokenResponse.json();
    return access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw error;
  }
}

async function sendPushNotifications(tokens: any[], tender: any, alert: any, projectId: string, accessToken: string) {
  const sendPromises = tokens.map(async ({ push_token }) => {
    console.log('Sending push notification to token:', push_token);
    
    const payload: WebPushPayload = {
      message: {
        token: push_token,
        notification: {
          title: "New Tender Match!",
          body: `A new tender matching your alert "${alert.name}": ${tender.title}`
        },
        data: {
          tenderId: tender.id,
          alertId: alert.id
        }
      }
    };
    console.log('FCM payload:', payload);

    const res = await fetch(
      `https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error('FCM API error:', errorText);
      throw new Error(`Failed to send push notification: ${errorText}`);
    }

    return await res.json();
  });

  return await Promise.all(sendPromises);
}

async function getUserEmail(userId: string) {
  const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserById(userId);
  if (error) {
    console.error('Error fetching user:', error);
    throw error;
  }
  if (!user?.email) {
    console.error('No email found for user:', userId);
    throw new Error('User email not found');
  }
  console.log('Found email for user:', user.email);
  return user.email;
}

async function sendEmail(tender_id: string, alert_id: string, user_id: string) {
  try {
    const userEmail = await getUserEmail(user_id);
    console.log('Sending email notification to:', userEmail);

    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/send-alert-email`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tender_id,
        alert_id,
        user_id,
        to: userEmail,
        subject: "New Tender Match!"
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Email service error:', errorText);
      throw new Error(`Email service responded with ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log('Email service response:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

Deno.serve(async (req) => {
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

    let pushResults = [];
    if (tokens && tokens.length > 0) {
      // Get access token for FCM
      const accessToken = await getAccessToken();
      const serviceAccount = JSON.parse(Deno.env.get('FIREBASE_SERVICE_ACCOUNT') ?? '{}');
      const projectId = serviceAccount.project_id;

      // Send push notifications
      pushResults = await sendPushNotifications(tokens, tender, alert, projectId, accessToken);
      console.log('Push notification results:', pushResults);
    } else {
      console.log('No push tokens found for user:', user_id);
    }

    // Send email notification
    console.log('Sending email notification');
    const emailResult = await sendEmail(tender_id, alert_id, user_id);
    console.log('Email notification result:', emailResult);

    return new Response(
      JSON.stringify({ 
        message: 'Notifications sent successfully', 
        push_results: pushResults,
        email_result: emailResult 
      }),
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
