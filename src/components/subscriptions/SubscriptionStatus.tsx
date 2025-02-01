import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Subscription } from "@/types/subscription";

interface SubscriptionStatusProps {
  subscription: Subscription | null;
}

export const SubscriptionStatus = ({ subscription }: SubscriptionStatusProps) => {
  if (!subscription) return null;

  return (
    <Alert variant="default" className="mb-6 border-green-500 bg-green-50">
      <AlertCircle className="h-4 w-4 text-green-600" />
      <AlertDescription className="text-green-600">
        You are currently subscribed to the {subscription.plan} plan.
        Your subscription will renew on {new Date(subscription.current_period_end).toLocaleDateString()}.
      </AlertDescription>
    </Alert>
  );
};