
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

    // Initialize clients
    const hf = new HfInference(Deno.env.get('HUGGING_FACE_ACCESS_TOKEN'))
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Use fetch API with timeout and retries
    const fetchWithRetry = async (url: string, retries = 5, timeout = 60000) => {
      let lastError;
      for (let i = 0; i < retries; i++) {
        try {
          console.log(`Attempt ${i + 1} to fetch image from ${url}`);
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), timeout);
          
          const response = await fetch(url, {
            signal: controller.signal,
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
              'Accept': 'image/*',
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache'
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          
          const contentType = response.headers.get('content-type');
          if (!contentType?.startsWith('image/')) {
            throw new Error(`Invalid content type: ${contentType}`);
          }
          
          return response;
        } catch (error) {
          console.error(`Attempt ${i + 1} failed:`, error);
          lastError = error;
          // Longer delay between retries
          if (i < retries - 1) await new Promise(r => setTimeout(r, 2000 * (i + 1)));
        }
      }
      throw new Error(`Failed to fetch image after ${retries} attempts: ${lastError?.message}`);
    };

    // Fetch the image
    console.log('Fetching image...')
    const response = await fetchWithRetry(imageUrl);
    const imageBlob = await response.blob()
    console.log('Successfully fetched image, size:', imageBlob.size, 'type:', imageBlob.type)

    if (imageBlob.size === 0) {
      throw new Error('Received empty image file');
    }

    // Convert GIF to PNG if needed
    let processedBlob = imageBlob
    if (imageBlob.type === 'image/gif') {
      console.log('Converting GIF to PNG...')
      try {
        const image = await createImageBitmap(imageBlob)
        const canvas = new OffscreenCanvas(image.width, image.height)
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          throw new Error('Failed to get canvas context')
        }
        
        // Draw white background first
        ctx.fillStyle = '#FFFFFF'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
        
        // Draw the image
        ctx.drawImage(image, 0, 0)
        
        processedBlob = await canvas.convertToBlob({ type: 'image/png' })
        console.log('Converted GIF to PNG, new size:', processedBlob.size)
      } catch (error) {
        console.error('Error converting GIF to PNG:', error)
        // If conversion fails, use the original image
        processedBlob = imageBlob
      }
    }

    try {
      // First pass: Use watermark removal model
      console.log('Removing watermarks...')
      const watermarkResult = await hf.imageToImage({
        image: processedBlob,
        model: "DamarJati/remove-watermark",
      })

      if (!watermarkResult) {
        throw new Error('Failed to remove watermarks')
      }

      // Second pass: Use segmentation model for background removal
      console.log('Processing with segmentation model...')
      const result = await hf.imageSegmentation({
        image: watermarkResult,
        model: "Xenova/segformer-b0-finetuned-ade-512-512",
      })

      if (!result || !Array.isArray(result) || result.length === 0) {
        throw new Error('Invalid segmentation result')
      }

      // Create canvas for final processing
      const image = await createImageBitmap(watermarkResult)
      const canvas = new OffscreenCanvas(image.width, image.height)
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Failed to get canvas context')

      // Set canvas dimensions
      canvas.width = image.width
      canvas.height = image.height
      
      // Draw white background first
      ctx.fillStyle = '#FFFFFF'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      
      // Draw the processed image
      ctx.drawImage(image, 0, 0)

      // Apply mask
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const data = imageData.data

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
    } catch (processingError) {
      console.error('Error during image processing:', processingError)
      throw processingError
    }
  } catch (error) {
    console.error('Error processing image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
