
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Subscription } from "@/types/subscription";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface PlanProps {
  name: string;
  priceInDZD: number;
  description: string;
  features: string[];
  priceId: string;
  categoryLimit?: number;
  subscription: Subscription | null;
  onSubscribe: (plan: any) => void;
  billingInterval: 'monthly' | 'annual';
}

export const PlanCard = ({
  name,
  priceInDZD,
  description,
  features,
  subscription,
  onSubscribe,
  billingInterval = 'monthly',
}: PlanProps) => {
  const navigate = useNavigate();
  const { session } = useAuth();

  const handleSubscribe = () => {
    if (!session) {
      navigate('/auth', { state: { returnTo: '/subscriptions' } });
      return;
    }
    onSubscribe({ name, priceInDZD, billingInterval });
  };

  return (
    <Card className="flex flex-col hover:shadow-lg transition-shadow duration-200">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-4">
          <span className="text-3xl font-bold">
            {priceInDZD.toLocaleString()} DZD
          </span>
          <span className="text-muted-foreground">/{billingInterval}</span>
          {billingInterval === 'annual' && (
            <div className="mt-1 text-sm text-emerald-600 font-medium">
              3 months saved
            </div>
          )}
        </div>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center">
              <span className="mr-2 text-emerald-600">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={handleSubscribe}
          disabled={subscription?.status === 'active' && subscription?.plan === name}
        >
          {subscription?.status === 'active' && subscription?.plan === name
            ? "Current Plan"
            : "Subscribe"} (Test)
        </Button>
      </CardFooter>
    </Card>
  );
};
