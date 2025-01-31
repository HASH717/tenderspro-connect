import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
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
  const { session } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session?.user?.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    }
  });

  const plans = [
    {
      name: "TendersPro Basic",
      priceInDZD: 100000, // 1000 DZD in cents
      description: "Perfect for getting started",
      features: [
        "Follow up to 3 categories",
        "Basic search functionality",
        "Email notifications",
      ],
      paymentLink: "https://pay.chargily.com/test/payment-links/01jjynyqzm8f91d5n07368dxj7"
    },
    {
      name: "TendersPro Professional",
      priceInDZD: 200000, // 2000 DZD in cents
      description: "For growing businesses",
      features: [
        "Follow up to 10 categories",
        "Advanced search filters",
        "Priority notifications",
        "Tender analytics",
      ],
      paymentLink: "https://pay.chargily.com/test/payment-links/01jjynzxx4jhzfggp55t4stfsa"
    },
    {
      name: "TendersPro Enterprise",
      priceInDZD: 1000000, // 10000 DZD in cents
      description: "For large organizations",
      features: [
        "Follow unlimited categories",
        "Custom alerts",
        "API access",
        "Dedicated support",
        "Custom integrations",
      ],
      paymentLink: "https://pay.chargily.com/test/payment-links/01jjyp0j13w6qtq7x4yfzr0nc2"
    },
  ];

  const handleSubscribe = async (planName: string, paymentLink: string) => {
    try {
      if (!session?.user?.id) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please login to subscribe to a plan",
        });
        return;
      }

      // Redirect to the Chargily payment link
      window.location.href = paymentLink;
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process subscription",
      });
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"} pb-24`}>
        <div className="max-w-6xl mx-auto px-4">
          {subscription && (
            <Alert variant="default" className="mb-6 border-green-500 bg-green-50">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-600">
                You are currently subscribed to the {subscription.plan} plan.
                Your subscription will renew on {new Date(subscription.current_period_end).toLocaleDateString()}.
              </AlertDescription>
            </Alert>
          )}

          <Alert variant="default" className="mb-6 border-yellow-500 bg-yellow-50">
            <AlertCircle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-600">
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
                      {(plan.priceInDZD / 100).toLocaleString()} DZD
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
                    onClick={() => handleSubscribe(plan.name, plan.paymentLink)}
                    disabled={subscription?.status === 'active' && subscription?.plan === plan.name}
                  >
                    {subscription?.status === 'active' && subscription?.plan === plan.name
                      ? t("subscription.current_plan", "Current Plan")
                      : t("subscription.subscribe", "Subscribe")} (Test)
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
