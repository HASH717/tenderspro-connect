
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SignatureV4 } from "https://deno.land/x/aws_sign_v4@1.0.2/mod.ts";

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
    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

    if (!accessKeyId || !secretAccessKey) {
      console.error('Missing AWS credentials');
      throw new Error('AWS credentials are not configured');
    }

    console.log('AWS credentials validated');

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

    // Prepare AWS SES API request
    const date = new Date();
    const region = "us-east-1";
    const service = "ses";
    
    const signer = new SignatureV4({
      service,
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      datetime: date.toISOString().replace(/[:-]|\.\d{3}/g, ''),
      signableHeaders: ['host', 'content-type'],
      body: JSON.stringify({
        Source: "abdou@trycartback.com",
        Destination: {
          ToAddresses: [to]
        },
        Message: {
          Subject: {
            Data: subject,
            Charset: "UTF-8"
          },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8"
            }
          }
        }
      }),
    });

    const url = `https://email.${region}.amazonaws.com/v2/email/outbound-emails`;
    const request = await signer.sign(
      new Request(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Host': `email.${region}.amazonaws.com`,
        },
      })
    );

    const response = await fetch(request);
    if (!response.ok) {
      const errorText = await response.text();
      console.error('AWS SES API error:', errorText);
      throw new Error(`Failed to send email: ${errorText}`);
    }

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
