
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

const supabaseClient = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting email sending process');
    const { tender_id, alert_id, user_id, to, subject } = await req.json();
    console.log('Received request:', { tender_id, alert_id, user_id, to, subject });

    if (!to) {
      throw new Error('Recipient email (to) is required');
    }

    const accessKeyId = Deno.env.get("AWS_ACCESS_KEY_ID");
    const secretAccessKey = Deno.env.get("AWS_SECRET_ACCESS_KEY");

    if (!accessKeyId || !secretAccessKey) {
      console.error('Missing AWS credentials');
      throw new Error('AWS credentials are not configured');
    }

    // Fetch tender and alert details
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tender_id)
      .single();

    if (tenderError) {
      console.error('Error fetching tender:', tenderError);
      throw tenderError;
    }
    console.log('Fetched tender:', tender);

    const { data: alert, error: alertError } = await supabaseClient
      .from('alerts')
      .select('*')
      .eq('id', alert_id)
      .single();

    if (alertError) {
      console.error('Error fetching alert:', alertError);
      throw alertError;
    }
    console.log('Fetched alert:', alert);

    // Check if email was already sent
    const { data: existingNotification, error: checkError } = await supabaseClient
      .from('alert_email_notifications')
      .select('*')
      .eq('alert_id', alert_id)
      .eq('tender_id', tender_id)
      .eq('user_id', user_id)
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
        tenderUrl: `${req.headers.get('origin') || 'https://tenders.pro'}/tenders/${tender.id}`
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

    console.log('Sending email to:', to);
    const response = await sesClient.send(sendEmailCommand);
    console.log('Email sent successfully:', response);

    // Log the email notification
    const { error: logError } = await supabaseClient
      .from('alert_email_notifications')
      .insert({
        alert_id: alert_id,
        tender_id: tender_id,
        user_id: user_id,
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
      .eq('alert_id', alert_id)
      .eq('tender_id', tender_id)
      .eq('user_id', user_id);

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
