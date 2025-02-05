
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const isValidHttpUrl = (string: string) => {
  try {
    const url = new URL(string);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch (_) {
    return false;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, tenderId } = await req.json()
    console.log(`Processing image for tender ${tenderId}: ${imageUrl}`)

    if (!imageUrl || !tenderId) {
      throw new Error('Missing required parameters')
    }

    // Clean and construct full image URL
    const cleanPath = imageUrl.replace(/^\/+/, '').replace(/^sites\/default\/files\//, '');
    const fullImageUrl = isValidHttpUrl(imageUrl)
      ? imageUrl
      : `https://old.dztenders.com/sites/default/files/${cleanPath}`;

    console.log('Attempting to fetch image from URL:', fullImageUrl);

    // Validate the constructed URL
    if (!isValidHttpUrl(fullImageUrl)) {
      throw new Error(`Invalid URL constructed: ${fullImageUrl}`);
    }

    try {
      // Test if the URL is accessible
      const testResponse = await fetch(fullImageUrl, { method: 'HEAD' });
      if (!testResponse.ok) {
        throw new Error(`URL not accessible: ${testResponse.status} ${testResponse.statusText}`);
      }
    } catch (error) {
      console.error('Error testing URL accessibility:', error);
      throw new Error(`Failed to access URL: ${fullImageUrl}`);
    }

    // Initialize Hugging Face client
    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
    
    // Fetch the image
    console.log('Fetching image...');
    const imageResponse = await fetch(fullImageUrl)
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`)
    }
    const imageBlob = await imageResponse.blob()

    // Use SAM to detect watermark regions
    console.log('Detecting watermark regions with SAM...')
    const segmentation = await hf.imageSegmentation({
      inputs: imageBlob,
      model: 'facebook/sam-vit-huge',
      parameters: {
        confidence_threshold: 0.7
      }
    })

    // Find the most likely watermark segment (usually text-like objects with high opacity)
    const watermarkMask = segmentation[0].mask // Use first mask as proof of concept

    // Use inpainting to remove watermark
    console.log('Removing watermark with inpainting...')
    const processedImage = await hf.imageToImage({
      inputs: {
        image: imageBlob,
        mask: watermarkMask,
      },
      model: 'stabilityai/stable-diffusion-2-inpainting',
      parameters: {
        prompt: 'clean document page',
        negative_prompt: 'watermark, text, logo',
        num_inference_steps: 30,
      }
    })

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Save original image to Supabase storage
    const originalImageBuffer = await imageBlob.arrayBuffer()
    const originalFileName = `original-${tenderId}.png`
    
    const { data: originalUploadData, error: originalUploadError } = await supabase
      .storage
      .from('tender-documents')
      .upload(originalFileName, originalImageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (originalUploadError) {
      throw originalUploadError
    }

    // Get public URL of original image
    const { data: originalPublicUrlData } = await supabase
      .storage
      .from('tender-documents')
      .getPublicUrl(originalFileName)

    // Upload processed image to Supabase storage
    const processedImageBuffer = await processedImage.arrayBuffer()
    const processedFileName = `processed-${tenderId}.png`
    
    const { data: processedUploadData, error: processedUploadError } = await supabase
      .storage
      .from('tender-documents')
      .upload(processedFileName, processedImageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (processedUploadError) {
      throw processedUploadError
    }

    // Get public URL of processed image
    const { data: processedPublicUrlData } = await supabase
      .storage
      .from('tender-documents')
      .getPublicUrl(processedFileName)

    // Update tender record with both image URLs
    const { error: updateError } = await supabase
      .from('tenders')
      .update({
        original_image_url: originalPublicUrlData.publicUrl,
        processed_image_url: processedPublicUrlData.publicUrl
      })
      .eq('id', tenderId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        originalImageUrl: originalPublicUrlData.publicUrl,
        processedImageUrl: processedPublicUrlData.publicUrl
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

