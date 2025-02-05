
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    // Initialize Hugging Face client
    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
    
    // Fetch the image
    const imageResponse = await fetch(imageUrl)
    if (!imageResponse.ok) {
      throw new Error('Failed to fetch image')
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

    // Upload processed image to Supabase storage
    const processedImageBuffer = await processedImage.arrayBuffer()
    const fileName = `processed-${tenderId}.png`
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('tender-documents')
      .upload(fileName, processedImageBuffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (uploadError) {
      throw uploadError
    }

    // Get public URL of processed image
    const { data: publicUrlData } = await supabase
      .storage
      .from('tender-documents')
      .getPublicUrl(fileName)

    // Update tender record with processed image URL
    const { error: updateError } = await supabase
      .from('tenders')
      .update({ processed_image_url: publicUrlData.publicUrl })
      .eq('id', tenderId)

    if (updateError) {
      throw updateError
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        processedImageUrl: publicUrlData.publicUrl
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
