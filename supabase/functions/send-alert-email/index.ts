
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { SESv2Client, SendEmailCommand } from "npm:@aws-sdk/client-sesv2";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { TenderMatchEmail } from './_templates/tender-match.tsx';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface EmailPayload {
  to: string;
  subject: string;
  alertId: string;
  tenderId: string;
  userId: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { to, subject, alertId, tenderId, userId } = payload;

    // Fetch tender and alert details
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .single();

    if (tenderError) throw tenderError;

    const { data: alert, error: alertError } = await supabaseClient
      .from('alerts')
      .select('*')
      .eq('id', alertId)
      .single();

    if (alertError) throw alertError;

    console.log('Email details:', {
      to,
      subject,
      fromEmail: "abdou@trycartback.com",
      tenderId,
      alertId,
      userId
    });

    // Check if email was already sent
    const { data: existingNotification, error: checkError } = await supabaseClient
      .from('alert_email_notifications')
      .select('*')
      .eq('alert_id', alertId)
      .eq('tender_id', tenderId)
      .eq('user_id', userId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing notification:', checkError);
      throw checkError;
    }

    if (existingNotification) {
      console.log('Email notification already sent:', existingNotification);
      return new Response(JSON.stringify({ 
        success: true, 
        message: 'Email notification already sent',
        details: existingNotification,
        status: 'already_sent'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    // Generate email HTML using React Email
    const html = await renderAsync(
      React.createElement(TenderMatchEmail, {
        tenderTitle: tender.title,
        alertName: alert.name,
        category: tender.category,
        wilaya: tender.wilaya,
        deadline: new Date(tender.deadline).toLocaleDateString(),
        tenderUrl: `${req.headers.get('origin')}/tenders/${tender.id}`
      })
    );

    // Initialize AWS SES client
    const sesClient = new SESv2Client({
      region: "us-east-1",
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });

    // Send email
    const sendEmailCommand = new SendEmailCommand({
      FromEmailAddress: "abdou@trycartback.com",
      Destination: {
        ToAddresses: [to],
      },
      Content: {
        Simple: {
          Subject: {
            Data: subject,
            Charset: "UTF-8",
          },
          Body: {
            Html: {
              Data: html,
              Charset: "UTF-8",
            },
          },
        },
      },
    });

    const response = await sesClient.send(sendEmailCommand);
    console.log('Email sent successfully:', response);

    // Log the email notification
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

    // Update tender notification as processed
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
