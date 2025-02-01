import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";

const Subscriptions = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  // Check for success parameter in URL
  useEffect(() => {
    const success = searchParams.get('success');
    const plan = searchParams.get('plan');
    
    if (success === 'true' && plan) {
      toast({
        title: "Subscription successful!",
        description: `You are now subscribed to the ${plan} plan.`,
        variant: "default",
      });
      // Invalidate and refetch subscription data
      queryClient.invalidateQueries({ queryKey: ['subscription'] });
    } else if (success === 'false') {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription was not completed.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast, queryClient]);

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

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .single();

      if (error) throw error;
      return data;
    }
  });

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

  const handleSubscribe = async (plan: typeof plans[0]) => {
    try {
      if (!session?.user?.id) {
        toast({
          variant: "destructive",
          title: "Authentication required",
          description: "Please login to subscribe to a plan",
        });
        return;
      }

      if (!profile?.preferred_categories?.length) {
        toast({
          variant: "destructive",
          title: "Categories required",
          description: "Please complete your onboarding first to select your preferred categories",
        });
        navigate('/onboarding');
        return;
      }

      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan: plan.name,
          priceId: plan.priceId,
          userId: session.user.id,
          backUrl: window.location.href,
          categories: profile.preferred_categories
        }
      });

      if (error) {
        console.error('Payment error:', error);
        throw error;
      }

      // Redirect to the checkout page
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      } else {
        throw new Error('No checkout URL received');
      }
    } catch (error: any) {
      console.error('Payment error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process payment",
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
                      {plan.priceInDZD.toLocaleString()} DZD
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
                    onClick={() => handleSubscribe(plan)}
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