
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";

export const TestModeAlert = () => {
  return (
    <Alert variant="default" className="mb-6 border-yellow-500 bg-yellow-50">
      <AlertCircle className="h-4 w-4 text-yellow-600" />
      <AlertDescription className="text-yellow-600">
        You are currently in test mode. Any subscriptions created will be test
        subscriptions and won't process real payments.
      </AlertDescription>
    </Alert>
  );
};
