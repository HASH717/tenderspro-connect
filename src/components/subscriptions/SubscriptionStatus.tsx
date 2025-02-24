import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { Subscription } from "@/types/subscription";

interface SubscriptionStatusProps {
  subscription: Subscription | null;
}

export const SubscriptionStatus = ({ subscription }: SubscriptionStatusProps) => {
  if (!subscription) return null;

  const isTrialSubscription = subscription.status === 'trial';
  const endDate = new Date(subscription.current_period_end).toLocaleDateString();

  return (
    <Alert 
      variant="default" 
      className={`mb-6 ${
        isTrialSubscription 
          ? 'border-yellow-500 bg-yellow-50' 
          : 'border-green-500 bg-green-50'
      }`}
    >
      <AlertCircle className={`h-4 w-4 ${isTrialSubscription ? 'text-yellow-600' : 'text-green-600'}`} />
      <AlertDescription className={isTrialSubscription ? 'text-yellow-600' : 'text-green-600'}>
        {isTrialSubscription
          ? `You are currently on a trial of the ${subscription.plan} plan. Your trial will end on ${endDate}.`
          : `You are currently subscribed to the ${subscription.plan} plan. Your subscription will renew on ${endDate}.`
        }
      </AlertDescription>
    </Alert>
  );
};
