
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    console.log('AWS SMTP credentials validated');

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

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

    // Check if email was already sent for this alert-tender combination
    const { data: existingNotification } = await supabaseClient
      .from('alert_email_notifications')
      .select('*')
      .eq('alert_id', alertId)
      .eq('tender_id', tenderId)
      .eq('user_id', userId)
      .single();

    if (existingNotification) {
      console.log('Email notification already sent:', existingNotification);
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Email notification already sent',
        details: existingNotification
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Send email using AWS SES SMTP
    const emailMessage = [
      "Content-Type: text/html; charset=utf-8",
      "MIME-Version: 1.0",
      `To: ${to}`,
      `From: abdou@trycartback.com`,
      `Subject: ${subject}`,
      "",
      html
    ].join("\r\n");

    const conn = await Deno.connect({ hostname: "email-smtp.us-east-1.amazonaws.com", port: 587 });
    const encoder = new TextEncoder();

    // Start TLS connection
    await conn.write(encoder.encode("EHLO localhost\r\n"));
    await conn.write(encoder.encode("STARTTLS\r\n"));
    
    // Authenticate
    await conn.write(encoder.encode(`AUTH LOGIN\r\n`));
    await conn.write(encoder.encode(`${btoa(awsUsername)}\r\n`));
    await conn.write(encoder.encode(`${btoa(awsPassword)}\r\n`));

    // Send email
    await conn.write(encoder.encode(`MAIL FROM:<abdou@trycartback.com>\r\n`));
    await conn.write(encoder.encode(`RCPT TO:<${to}>\r\n`));
    await conn.write(encoder.encode("DATA\r\n"));
    await conn.write(encoder.encode(emailMessage + "\r\n.\r\n"));
    await conn.write(encoder.encode("QUIT\r\n"));

    conn.close();

    console.log('Email sent successfully');

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

    // Update the tender notification as processed
    const { error: updateError } = await supabaseClient
      .from('tender_notifications')
      .update({ processed_at: new Date().toISOString() })
      .eq('alert_id', alertId)
      .eq('tender_id', tenderId)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating tender notification:', updateError);
      throw updateError;
    }

    console.log('Tender notification marked as processed');

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
