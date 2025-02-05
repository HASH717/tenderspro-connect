
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const AdminImageProcessor = () => {
  return (
    <Card className="p-4">
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          Image processing has been disabled. Original images are being displayed directly.
        </div>
      </div>
    </Card>
  );
};
