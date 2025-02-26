import { SubscriptionInfo } from "@/components/profile/SubscriptionInfo";

interface SubscriptionTabProps {
  subscription: any;
  isMobile: boolean;
}

export const SubscriptionTab = ({ subscription, isMobile }: SubscriptionTabProps) => {
  return (
    <div className="bg-white rounded-lg border">
      <SubscriptionInfo 
        subscription={subscription}
        isMobile={isMobile}
      />
    </div>
  );
};