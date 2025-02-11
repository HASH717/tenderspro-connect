
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
    // Validate AWS credentials
    const awsUsername = Deno.env.get("AWS_SMTP_USERNAME");
    const awsPassword = Deno.env.get("AWS_SMTP_PASSWORD");

    if (!awsUsername || !awsPassword) {
      console.error('Missing AWS SMTP credentials');
      throw new Error('AWS SMTP credentials are not configured');
    }

    console.log('AWS SMTP credentials found');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('Creating SMTP client...');
    const client = new SMTPClient({
      connection: {
        hostname: "email-smtp.us-east-1.amazonaws.com",
        port: 587,
        tls: true,
        auth: {
          username: awsUsername,
          password: awsPassword,
        },
      },
    });
    console.log('SMTP client created successfully');

    const payload: EmailPayload = await req.json();
    const { to, subject, html, alertId, tenderId, userId } = payload;

    console.log('Email details:', {
      to,
      subject,
      fromEmail: "abdou@trycartback.com",
      hasHtmlContent: !!html,
      alertId,
      tenderId,
      userId
    });

    // Send email
    console.log('Attempting to send email...');
    const sendResult = await client.send({
      from: "abdou@trycartback.com",
      to: to,
      subject: subject,
      content: html,
    });

    console.log('Email sent successfully:', sendResult);

    // Log the email notification
    console.log('Logging email notification to database...');
    const { error: logError } = await supabaseClient
      .from('alert_email_notifications')
      .insert({
        alert_id: alertId,
        tender_id: tenderId,
        user_id: userId,
        email_status: 'sent',
        sent_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging email notification:', logError);
      throw logError;
    }

    console.log('Email notification logged successfully');

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Email sent and logged successfully',
      details: {
        to,
        subject,
        sentAt: new Date().toISOString()
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    console.error('Error in send-alert-email function:', error);
    console.error('Full error details:', {
      name: error.name,
      message: error.message,
      stack: error.stack
    });

    return new Response(
      JSON.stringify({ 
        error: error.message,
        details: 'Failed to send or log email notification',
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
