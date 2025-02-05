
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";

export const AdminImageProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingResults, setProcessingResults] = useState<any[]>([]);
  const { toast } = useToast();

  const handleProcessImages = async () => {
    try {
      setIsProcessing(true);
      setProcessingResults([]);
      
      const { data, error } = await supabase.functions.invoke('process-all-images');
      
      if (error) throw error;
      
      if (data.results) {
        setProcessingResults(data.results);
      }
      
      toast({
        title: "Image Processing Complete",
        description: `Successfully processed ${data.processed} images with ${data.errors} errors.`,
      });
      
    } catch (error: any) {
      console.error('Error processing images:', error);
      toast({
        title: "Error",
        description: "Failed to process images. Please check the console for details.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="space-y-4">
        <Button 
          onClick={handleProcessImages} 
          disabled={isProcessing}
          className="w-full"
        >
          {isProcessing ? "Processing Images..." : "Process All Images"}
        </Button>

        {processingResults.length > 0 && (
          <ScrollArea className="h-[200px] w-full rounded-md border p-4">
            <div className="space-y-2">
              {processingResults.map((result, index) => (
                <div 
                  key={index}
                  className={`text-sm ${result.success ? 'text-green-600' : 'text-red-600'}`}
                >
                  Tender {result.tenderId}: {result.success ? 'Success' : `Failed - ${result.error}`}
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>
    </Card>
  );
};
