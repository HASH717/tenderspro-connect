
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'
import { HfInference } from 'https://esm.sh/@huggingface/inference@2.3.2'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { imageUrl, tenderId } = await req.json()
    console.log(`Processing image for tender ${tenderId} from URL: ${imageUrl}`)

    if (!imageUrl || !tenderId) {
      throw new Error('Missing required parameters')
    }

    // Initialize Hugging Face client
    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))

    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use fetch API with timeout and retries
    const fetchWithRetry = async (url: string, retries = 3) => {
      let lastError;
      for (let i = 0; i < retries; i++) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
          
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'image/gif,image/jpeg,image/png,*/*',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
          return response;
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error);
          lastError = error;
          if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1))); // Exponential backoff
        }
      }
      throw lastError;
    };

    // Fetch the image with retries
    console.log('Fetching image...')
    const response = await fetchWithRetry(imageUrl);
    const imageBlob = await response.blob()
    console.log('Successfully fetched image, size:', imageBlob.size, 'type:', imageBlob.type)

    // Convert GIF to PNG if needed
    let processedBlob = imageBlob
    if (imageBlob.type === 'image/gif') {
      console.log('Converting GIF to PNG...')
      const image = await createImageBitmap(imageBlob)
      const canvas = new OffscreenCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      
      if (!ctx) {
        throw new Error('Failed to get canvas context')
      }
      
      ctx.drawImage(image, 0, 0)
      processedBlob = await canvas.convertToBlob({ type: 'image/png' })
      console.log('Converted GIF to PNG, new size:', processedBlob.size)
    }

    // Process image with segmentation model
    console.log('Processing with Hugging Face model...')
    const result = await hf.imageSegmentation({
      image: processedBlob,
      model: "Xenova/segformer-b0-finetuned-ade-512-512",
    })

    if (!result || !Array.isArray(result) || result.length === 0) {
      throw new Error('Invalid segmentation result')
    }

    // Create a canvas to process the image
    const canvas = new OffscreenCanvas(800, 600)
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Failed to get canvas context')

    // Load the image into the canvas
    const img = await createImageBitmap(processedBlob)
    canvas.width = img.width
    canvas.height = img.height
    ctx.drawImage(img, 0, 0)

    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const data = imageData.data

    // Apply mask
    for (let i = 0; i < result[0].mask.data.length; i++) {
      const alpha = Math.round((1 - result[0].mask.data[i]) * 255)
      data[i * 4 + 3] = alpha
    }

    ctx.putImageData(imageData, 0, 0)

    // Convert to blob
    const finalBlob = await canvas.convertToBlob({
      type: 'image/png',
      quality: 1.0
    })

    // Upload processed image to Supabase Storage
    const fileName = `${tenderId}-processed-${Date.now()}.png`
    const { error: uploadError } = await supabase.storage
      .from('tender-documents')
      .upload(fileName, finalBlob, {
        contentType: 'image/png',
        upsert: false
      })

    if (uploadError) {
      console.error('Upload error:', uploadError)
      throw uploadError
    }

    // Get public URL of uploaded image
    const { data: publicUrlData } = supabase.storage
      .from('tender-documents')
      .getPublicUrl(fileName)

    // Update tender with processed image URL
    const { error: updateError } = await supabase
      .from('tenders')
      .update({ processed_image_url: publicUrlData.publicUrl })
      .eq('id', tenderId)

    if (updateError) {
      console.error('Update error:', updateError)
      throw updateError
    }

    console.log('Successfully uploaded and processed image')
    return new Response(
      JSON.stringify({ success: true, processedImageUrl: publicUrlData.publicUrl }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error processing image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
