
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SMTPClient } from "https://deno.land/x/smtp@v0.7.0/mod.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  to: string;
  subject: string;
  html: string;
  alertId: string;
  tenderId: string;
  userId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const client = new SMTPClient({
      connection: {
        hostname: "email-smtp.us-east-1.amazonaws.com",
        port: 587,
        tls: true,
        auth: {
          username: Deno.env.get("AWS_SMTP_USERNAME") ?? '',
          password: Deno.env.get("AWS_SMTP_PASSWORD") ?? '',
        },
      },
    });

    const payload: EmailPayload = await req.json();
    const { to, subject, html, alertId, tenderId, userId } = payload;

    // Send email
    await client.send({
      from: "abdou@trycartback.com",
      to: to,
      subject: subject,
      content: html,
    });

    // Log the email notification
    const { error: logError } = await supabaseClient
      .from('alert_email_notifications')
      .insert({
        alert_id: alertId,
        tender_id: tenderId,
        user_id: userId,
        email_status: 'sent'
      });

    if (logError) {
      console.error('Error logging email notification:', logError);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
