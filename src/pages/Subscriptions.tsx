import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Subscriptions = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();

  const plans = [
    {
      name: "Basic",
      price: "2000",
      description: "Perfect for getting started",
      features: [
        "Access to all public tenders",
        "Basic search functionality",
        "Email notifications",
      ],
    },
    {
      name: "Pro",
      price: "5000",
      description: "For growing businesses",
      features: [
        "Everything in Basic",
        "Advanced search filters",
        "Priority notifications",
        "Tender analytics",
      ],
    },
    {
      name: "Enterprise",
      price: "10000",
      description: "For large organizations",
      features: [
        "Everything in Pro",
        "Custom alerts",
        "API access",
        "Dedicated support",
        "Custom integrations",
      ],
    },
  ];

  const handleSubscribe = async (planName: string, price: string) => {
    try {
      const response = await fetch("/api/create-subscription", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          plan: planName,
          amount: parseInt(price),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to create subscription");
      }

      const data = await response.json();
      window.location.href = data.paymentUrl;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process subscription",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
        <div className="max-w-6xl mx-auto px-4">
          <Alert variant="warning" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You are currently in test mode. Any subscriptions created will be test
              subscriptions and won't process real payments.
            </AlertDescription>
          </Alert>

          <h1 className="text-2xl font-bold text-primary mb-8">
            {t("subscription.title", "Choose Your Plan")}
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => (
              <Card key={plan.name} className="flex flex-col">
                <CardHeader>
                  <CardTitle>{plan.name}</CardTitle>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow">
                  <div className="mb-4">
                    <span className="text-3xl font-bold">
                      {parseInt(plan.price).toLocaleString()} DZD
                    </span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
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
                    onClick={() => handleSubscribe(plan.name, plan.price)}
                  >
                    {t("subscription.subscribe", "Subscribe")} (Test)
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Subscriptions;