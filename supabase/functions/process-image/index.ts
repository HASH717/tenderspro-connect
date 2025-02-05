
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { decode } from "https://deno.land/x/imagescript@1.2.15/mod.ts"

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

    // Clean and construct full image URL if needed
    let fullImageUrl = imageUrl
    if (!isValidHttpUrl(imageUrl)) {
      // Remove any leading slashes and 'sites/default/files/' prefix
      const cleanPath = imageUrl.replace(/^\/+/, '').replace(/^sites\/default\/files\//, '')
      fullImageUrl = `https://old.dztenders.com/sites/default/files/${cleanPath}`
    }

    console.log('Using full image URL:', fullImageUrl)

    // Initialize Supabase client early so we can use it for error handling
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration')
    }
    const supabase = createClient(supabaseUrl, supabaseKey)

    try {
      // Try to fetch with a timeout
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 30000) // 30 second timeout

      const imageResponse = await fetch(fullImageUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      })

      clearTimeout(timeout)

      if (!imageResponse.ok) {
        throw new Error(`Failed to fetch image: ${imageResponse.status} ${imageResponse.statusText}`)
      }

      const contentType = imageResponse.headers.get('content-type')
      console.log('Image content type:', contentType)
      
      // Get the image data as an ArrayBuffer
      const imageBuffer = await imageResponse.arrayBuffer()
      
      // Convert image to PNG using ImageScript
      console.log('Converting image to PNG format...')
      const image = await decode(new Uint8Array(imageBuffer))
      const pngBuffer = await image.encode() // This will encode to PNG by default
      
      // Save original image as PNG to Supabase storage
      const originalFileName = `original-${tenderId}.png`
      
      console.log('Uploading original PNG image...')
      const { data: originalUploadData, error: originalUploadError } = await supabase
        .storage
        .from('tender-documents')
        .upload(originalFileName, pngBuffer, {
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

      // Initialize Hugging Face
      const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
      
      console.log('Detecting watermark regions with SAM...')
      const segmentation = await hf.imageSegmentation({
        inputs: new Blob([pngBuffer], { type: 'image/png' }),
        model: 'facebook/sam-vit-huge',
        parameters: {
          confidence_threshold: 0.7
        }
      })

      // Find the most likely watermark segment
      const watermarkMask = segmentation[0].mask

      console.log('Removing watermark with inpainting...')
      const processedImage = await hf.imageToImage({
        inputs: {
          image: new Blob([pngBuffer], { type: 'image/png' }),
          mask: watermarkMask,
        },
        model: 'stabilityai/stable-diffusion-2-inpainting',
        parameters: {
          prompt: 'clean document page',
          negative_prompt: 'watermark, text, logo',
          num_inference_steps: 30,
        }
      })

      // Upload processed image to Supabase storage
      const processedFileName = `processed-${tenderId}.png`
      const processedImageBuffer = await processedImage.arrayBuffer()
      
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

      console.log('Successfully processed and stored images')

      return new Response(
        JSON.stringify({ 
          success: true,
          originalImageUrl: originalPublicUrlData.publicUrl,
          processedImageUrl: processedPublicUrlData.publicUrl
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )

    } catch (fetchError) {
      console.error('Error fetching or processing image:', fetchError)
      
      // Try to update the tender with just the URL if we can't process it
      const { error: updateError } = await supabase
        .from('tenders')
        .update({
          original_image_url: fullImageUrl
        })
        .eq('id', tenderId)

      if (updateError) {
        console.error('Error updating tender with original URL:', updateError)
      }

      throw new Error(`Failed to process image: ${fetchError.message}`)
    }

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
