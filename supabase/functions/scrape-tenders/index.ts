import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.0'
import { corsHeaders } from '../_shared/cors.ts'
import { 
  fetchTendersPage, 
  fetchTenderDetails, 
  formatTenderData, 
  handleError,
  TenderData 
} from '../_shared/tender-scraper-utils.ts'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { 
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'POST',
      }
    });
  }

  try {
    // Use the provided credentials
    const username = 'motraxa@gmail.com';
    const password = 'Dahdouhhash@717';
    
    const credentials = btoa(`${username}:${password}`);
    const authHeader = `Basic ${credentials}`;

    const requestBody = await req.text().then(text => text ? JSON.parse(text) : {});
    const { page = 1 } = requestBody;
    console.log(`Processing page ${page}`);
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    let successCount = 0;
    let errorCount = 0;

    // Use the correct URL format for fetching tenders
    console.log(`Making request to: https://api.dztenders.com/tenders/?page=${page}&format=json`);
    console.log(`Using auth header: Basic ${credentials}`);
    
    const tendersResponse = await fetch(`https://api.dztenders.com/tenders/?page=${page}&format=json`, {
      headers: {
        'Authorization': authHeader,
        'Accept': 'application/json',
        'User-Agent': 'TendersPro/1.0',
      },
    });

    if (!tendersResponse.ok) {
      throw new Error(`Failed to fetch tenders page: ${tendersResponse.status}`);
    }

    const tendersData = await tendersResponse.json();
    const tenders = tendersData.results || [];
    
    console.log(`Found ${tenders.length} tenders on page ${page}`);

    for (const tender of tenders) {
      try {
        // Check if tender already exists
        const { data: existingTender } = await supabase
          .from('tenders')
          .select('tender_id')
          .eq('tender_id', tender.id.toString())
          .maybeSingle();

        if (existingTender) {
          console.log(`Tender ${tender.id} already exists, skipping`);
          successCount++;
          continue;
        }

        // Fetch detailed tender information with retries
        let detailData = null;
        let retryCount = 0;
        const maxRetries = 3;
        let lastError = null;

        while (retryCount < maxRetries) {
          try {
            // Add exponential backoff delay between retries
            if (retryCount > 0) {
              const delay = Math.pow(2, retryCount) * 1000; // 2s, 4s, 8s
              console.log(`Retry ${retryCount + 1} for tender ${tender.id}, waiting ${delay}ms`);
              await new Promise(resolve => setTimeout(resolve, delay));
            }
            
            const detailUrl = `https://api.dztenders.com/tenders/${tender.id}/?format=json`;
            console.log(`Making request to: ${detailUrl}`);
            
            const response = await fetch(detailUrl, {
              headers: {
                'Authorization': authHeader,
                'Accept': 'application/json',
                'User-Agent': 'TendersPro/1.0',
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            detailData = await response.json();
            console.log(`Successfully fetched details for tender ${tender.id}`);
            break;
          } catch (error) {
            lastError = error;
            retryCount++;
            console.error(`Attempt ${retryCount} failed for tender ${tender.id}:`, error);
            
            // If we get a 403, we should break immediately as retrying won't help
            if (error.message.includes('403')) {
              throw new Error(`Authentication failed for tender ${tender.id}: ${error.message}`);
            }
            
            if (retryCount === maxRetries) {
              throw new Error(`Failed to fetch tender details after ${maxRetries} attempts: ${error.message}`);
            }
          }
        }

        if (!detailData) {
          throw new Error(`Failed to fetch details for tender ${tender.id} after ${maxRetries} attempts: ${lastError?.message}`);
        }

        const formattedTender = formatTenderData(tender as TenderData, detailData);

        // Insert the new tender
        const { error: insertError } = await supabase
          .from('tenders')
          .insert(formattedTender);

        if (insertError) {
          console.error(`Error inserting tender ${tender.id}:`, insertError);
          errorCount++;
        } else {
          successCount++;
          console.log(`Successfully processed tender ${tender.id} (${successCount}/${tenders.length})`);
        }

      } catch (error) {
        console.error(`Error processing tender ${tender.id}:`, error);
        errorCount++;
      }

      // Add small delay between processing each tender
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    console.log(`Completed page ${page} with ${successCount} successes and ${errorCount} errors`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully processed page ${page}`,
        count: successCount,
        errors: errorCount,
        page: page
      }), 
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json'
        } 
      }
    );

  } catch (error) {
    return handleError(error);
  }
});