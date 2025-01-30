import React from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

export const NotificationDemo = () => {
  const showNotification = () => {
    toast({
      title: "New Tender Alert",
      description: "A new tender matching your criteria has been published in Algiers",
      variant: "default",
    });
  };

  return (
    <div className="flex justify-center p-4">
      <Button onClick={showNotification}>Show Sample Notification</Button>
    </div>
  );
};