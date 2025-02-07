
import { createClient } from 'npm:@supabase/supabase-js@2.38.4'
import Jimp from 'npm:jimp@0.22.10'
import { Buffer } from "node:buffer"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Track active processing
const activeProcessing = new Set();

const CHUNK_SIZE = 1024 * 1024; // 1MB chunks

async function fetchImageInChunks(url: string) {
  console.log('Fetching image in chunks from:', url);
  
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch image: ${response.statusText}`);
  }

  // Create a buffer to store the image data
  const chunks: Uint8Array[] = [];
  let totalSize = 0;

  // Use the ReadableStream API to read the response body
  const reader = response.body!.getReader();

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      console.log('Finished reading image data, total size:', totalSize);
      break;
    }

    chunks.push(value);
    totalSize += value.length;
    console.log(`Received chunk of ${value.length} bytes, total: ${totalSize}`);
  }

  // Combine chunks into final buffer
  const finalBuffer = new Uint8Array(totalSize);
  let offset = 0;
  
  for (const chunk of chunks) {
    finalBuffer.set(chunk, offset);
    offset += chunk.length;
  }

  console.log(`Successfully assembled ${chunks.length} chunks into ${totalSize} bytes`);
  return finalBuffer;
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  let tenderId = null;
  let image = null;
  let imageData = null;
  
  try {
    const { tenderId: id } = await req.json();
    tenderId = id;
    
    if (!tenderId) {
      throw new Error('No tender ID provided');
    }

    console.log(`Starting watermark processing for tender ${tenderId}`);
    
    // Prevent concurrent processing of the same tender
    if (activeProcessing.has(tenderId)) {
      throw new Error('This tender is already being processed');
    }
    activeProcessing.add(tenderId);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Get tender details
    const { data: tender, error: tenderError } = await supabaseClient
      .from('tenders')
      .select('*')
      .eq('id', tenderId)
      .maybeSingle();

    if (tenderError) {
      throw new Error(`Failed to fetch tender: ${tenderError.message}`);
    }

    if (!tender) {
      throw new Error('Tender not found');
    }

    const imageUrl = tender.image_url;
    if (!imageUrl) {
      throw new Error('No image URL found in tender');
    }

    console.log(`Processing image for tender ${tenderId} from URL: ${imageUrl}`);

    // Store original image URL if not already stored
    if (!tender.original_image_url) {
      await supabaseClient
        .from('tenders')
        .update({ original_image_url: imageUrl })
        .eq('id', tenderId);
    }

    try {
      // Use proxy for CORS issues
      const proxyUrl = 'https://api.codetabs.com/v1/proxy?quest=';
      console.log(`Fetching image through proxy: ${proxyUrl}${encodeURIComponent(imageUrl)}`);
      
      imageData = await fetchImageInChunks(proxyUrl + encodeURIComponent(imageUrl));
      if (!imageData || imageData.length === 0) {
        throw new Error('Received empty image data');
      }

      console.log(`Successfully fetched image data: ${imageData.length} bytes`);

      const fileExtension = imageUrl.split('.').pop()?.toLowerCase() || 'jpg';
      console.log(`File extension detected: ${fileExtension}`);

      console.log('Creating Jimp instance...');
      image = await Jimp.default.read(Buffer.from(imageData));

      // Add watermark text
      const FONT_SIZE = Math.min(image.getWidth(), image.getHeight()) / 20;
      const font = await Jimp.default.loadFont(Jimp.default.FONT_SANS_64_BLACK);
      
      const watermarkText = 'TENDERSPRO.CO';
      const maxWidth = image.getWidth() * 0.8;
      
      const textWidth = Jimp.default.measureText(font, watermarkText);
      const x = (image.getWidth() - textWidth) / 2;
      const y = (image.getHeight() - 64) / 2;

      image.opacity(0.3);
      image.print(
        font,
        x,
        y,
        {
          text: watermarkText,
          alignmentX: Jimp.default.HORIZONTAL_ALIGN_CENTER,
          alignmentY: Jimp.default.VERTICAL_ALIGN_MIDDLE
        },
        maxWidth
      );
      image.opacity(1);

      // Maintain original format
      const mimeType = fileExtension === 'gif' ? Jimp.default.MIME_GIF :
                      fileExtension === 'png' ? Jimp.default.MIME_PNG :
                      Jimp.default.MIME_JPEG;

      console.log(`Processing with mime type: ${mimeType}`);
      
      const processedImageBuffer = await new Promise<Buffer>((resolve, reject) => {
        image.getBuffer(mimeType, (err, buffer) => {
          if (err) reject(err);
          else resolve(buffer);
        });
      });

      const filename = `${tenderId}-${Date.now()}.${fileExtension}`;
      console.log(`Uploading processed image as ${filename} (${processedImageBuffer.length} bytes)`);

      // Upload processed image in chunks if large
      if (processedImageBuffer.length > CHUNK_SIZE) {
        console.log(`File is large (${processedImageBuffer.length} bytes), uploading in chunks`);
        const chunks = Math.ceil(processedImageBuffer.length / CHUNK_SIZE);
        
        for (let i = 0; i < chunks; i++) {
          const start = i * CHUNK_SIZE;
          const end = Math.min(start + CHUNK_SIZE, processedImageBuffer.length);
          const chunk = processedImageBuffer.slice(start, end);
          
          const { error: chunkError } = await supabaseClient.storage
            .from('tender-documents')
            .upload(`${filename}.part${i}`, chunk, {
              contentType: `image/${fileExtension}`,
              cacheControl: '3600'
            });

          if (chunkError) {
            throw new Error(`Failed to upload chunk ${i}: ${chunkError.message}`);
          }
          
          console.log(`Successfully uploaded chunk ${i + 1}/${chunks}`);
        }
      }

      // Upload complete file
      const { error: uploadError } = await supabaseClient
        .storage
        .from('tender-documents')
        .upload(filename, processedImageBuffer, {
          contentType: `image/${fileExtension}`,
          cacheControl: '3600'
        });

      if (uploadError) {
        throw new Error(`Failed to upload processed image: ${uploadError.message}`);
      }

      const { data: { publicUrl } } = supabaseClient
        .storage
        .from('tender-documents')
        .getPublicUrl(filename);

      console.log(`Updating tender record with new image URL: ${publicUrl}`);
      const { error: updateError } = await supabaseClient
        .from('tenders')
        .update({ 
          watermarked_image_url: publicUrl,
          processed_at: new Date().toISOString()
        })
        .eq('id', tenderId);

      if (updateError) {
        throw new Error(`Failed to update tender record: ${updateError.message}`);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Processing completed',
          url: publicUrl
        }),
        { 
          headers: { 
            ...corsHeaders,
            'Content-Type': 'application/json'
          } 
        }
      );

    } catch (processingError) {
      console.error(`Error processing image for tender ${tenderId}:`, processingError);
      throw processingError;
    }

  } catch (error) {
    console.error('Error in process-complete-watermark function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: errorMessage
      }),
      { 
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      }
    );
  } finally {
    // Aggressive cleanup
    if (image) {
      image.bitmap?.data && (image.bitmap.data = null);
      image = null;
    }
    imageData = null;
    
    if (tenderId) {
      activeProcessing.delete(tenderId);
      console.log(`Removed tender ${tenderId} from active processing`);
    }

    // Force garbage collection if available
    try {
      // @ts-ignore: Deno.core is available in edge runtime
      Deno.core.gc();
    } catch {
      // Ignore if gc is not available
    }
  }
});
