import { useTranslation } from "react-i18next";
import { PlanCard } from "./PlanCard";
import { Subscription } from "@/types/subscription";

interface SubscriptionPlansProps {
  subscription: Subscription | null;
  onSubscribe: (plan: any) => void;
}

export const SubscriptionPlans = ({ subscription, onSubscribe }: SubscriptionPlansProps) => {
  const { t } = useTranslation();

  const plans = [
    {
      name: "Basic",
      priceInDZD: 1000,
      description: "Perfect for getting started",
      features: [
        "Follow up to 3 categories",
        "Basic search functionality",
        "Email notifications",
      ],
      priceId: "01jjynsfaqmh26p7738may84eq",
      categoryLimit: 3
    },
    {
      name: "Professional",
      priceInDZD: 2000,
      description: "For growing businesses",
      features: [
        "Follow up to 10 categories",
        "Advanced search filters",
        "Priority notifications",
        "Tender analytics",
      ],
      priceId: "01jjyntr26nrbx34t2s9kq6mn4",
      categoryLimit: 10
    },
    {
      name: "Enterprise",
      priceInDZD: 10000,
      description: "For large organizations",
      features: [
        "Follow unlimited categories",
        "Custom alerts",
        "API access",
        "Dedicated support",
        "Custom integrations",
      ],
      priceId: "01jjynvj74dk1ktj8z4h30yge1"
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {plans.map((plan) => (
        <PlanCard
          key={plan.name}
          {...plan}
          subscription={subscription}
          onSubscribe={onSubscribe}
        />
      ))}
    </div>
  );
};