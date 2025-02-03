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

interface PlanProps {
  name: string;
  priceInDZD: number;
  description: string;
  features: string[];
  priceId: string;
  categoryLimit?: number;
  subscription: Subscription | null;
  onSubscribe: (plan: any) => void;
}

export const PlanCard = ({
  name,
  priceInDZD,
  description,
  features,
  priceId,
  subscription,
  onSubscribe,
}: PlanProps) => {
  return (
    <Card className="flex flex-col">
      <CardHeader>
        <CardTitle>{name}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow">
        <div className="mb-4">
          <span className="text-3xl font-bold">
            {priceInDZD.toLocaleString()} DZD
          </span>
          <span className="text-muted-foreground">/month</span>
        </div>
        <ul className="space-y-2">
          {features.map((feature) => (
            <li key={feature} className="flex items-center">
              <span className="mr-2">✓</span>
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter>
        <Button
          className="w-full"
          onClick={() => onSubscribe({ name, priceInDZD, priceId })}
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