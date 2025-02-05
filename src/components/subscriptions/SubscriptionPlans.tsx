
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import { PlanCard } from "./PlanCard";
import { Subscription } from "@/types/subscription";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface SubscriptionPlansProps {
  subscription: Subscription | null;
  onSubscribe: (plan: any) => void;
}

export const SubscriptionPlans = ({ subscription, onSubscribe }: SubscriptionPlansProps) => {
  const { t } = useTranslation();
  const [isAnnual, setIsAnnual] = useState(false);

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
      priceId: isAnnual ? "01jjynsfaqmh26p7738may84eq-annual" : "01jjynsfaqmh26p7738may84eq",
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
      priceId: isAnnual ? "01jjyntr26nrbx34t2s9kq6mn4-annual" : "01jjyntr26nrbx34t2s9kq6mn4",
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
      priceId: isAnnual ? "01jjynvj74dk1ktj8z4h30yge1-annual" : "01jjynvj74dk1ktj8z4h30yge1"
    },
  ];

  // Apply annual pricing (12 months) with 25% discount
  const adjustedPlans = plans.map(plan => ({
    ...plan,
    priceInDZD: isAnnual ? Math.round(plan.priceInDZD * 12 * 0.75) : plan.priceInDZD,
    billingInterval: isAnnual ? 'annual' as const : 'monthly' as const
  }));

  const annualSavings = plans.reduce((total, plan) => total + (plan.priceInDZD * 3), 0);

  return (
    <div className="space-y-8">
      <div className="flex flex-col items-center justify-center space-y-4 bg-gradient-to-r from-emerald-50 to-emerald-100 p-6 rounded-lg">
        <div className="flex items-center space-x-8">
          <span className="text-gray-600">Monthly</span>
          <div className="flex items-center space-x-2">
            <Switch
              checked={isAnnual}
              onCheckedChange={setIsAnnual}
              className="data-[state=checked]:bg-emerald-600"
            />
            <Label>Annual</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Badge variant="secondary" className="bg-emerald-100 text-emerald-800">
              Save 25%
            </Badge>
          </div>
        </div>
        {isAnnual && (
          <p className="text-sm text-emerald-700 font-medium">
            🎉 Save up to {annualSavings.toLocaleString()} DZD per year with annual billing
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {adjustedPlans.map((plan) => (
          <PlanCard
            key={plan.name}
            {...plan}
            subscription={subscription}
            onSubscribe={onSubscribe}
          />
        ))}
      </div>
    </div>
  );
};
