
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

export const AdminImageProcessor = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();

  const handleProcessImages = async () => {
    try {
      setIsProcessing(true);
      
      const { data, error } = await supabase.functions.invoke('process-all-images');
      
      if (error) throw error;
      
      toast({
        title: "Image Processing Complete",
        description: `Successfully processed ${data.processed} images with ${data.errors} errors.`,
      });
      
    } catch (error) {
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
      </div>
    </Card>
  );
};
