import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

interface Subscription {
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

interface SubscriptionInfoProps {
  subscription: Subscription | null;
  isMobile: boolean;
}

export const SubscriptionInfo = ({ subscription, isMobile }: SubscriptionInfoProps) => {
  const navigate = useNavigate();

  return (
    <div className="p-6">
      {subscription ? (
        <>
          <h3 className="text-lg font-semibold mb-4">Current Subscription</h3>
          <div className="space-y-3">
            <p className="flex justify-between items-center">
              <span className="font-medium">Plan:</span>
              <span className="text-primary font-semibold">{subscription.plan}</span>
            </p>
            <p className="flex justify-between items-center">
              <span className="font-medium">Status:</span>
              <span className={`capitalize font-semibold ${subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                {subscription.status}
              </span>
            </p>
            <p className="flex justify-between items-center">
              <span className="font-medium">Current Period:</span>
              <span className="text-gray-600">
                {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            </p>
          </div>
          <Button 
            className="mt-6 w-full"
            onClick={() => navigate('/subscriptions')}
          >
            Manage Subscription
          </Button>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold mb-4">No Active Subscription</h3>
          <p className="text-gray-600 mb-6">
            You currently don't have an active subscription. Subscribe to access more features.
          </p>
          <Button 
            className="w-full bg-green-500 hover:bg-green-600 text-white"
            onClick={() => navigate('/subscriptions')}
          >
            Upgrade
          </Button>
        </>
      )}
    </div>
  );
};