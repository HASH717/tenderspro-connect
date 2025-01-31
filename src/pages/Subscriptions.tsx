import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
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
import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";

const CATEGORIES = [
  { value: "construction", label: "Construction" },
  { value: "it", label: "IT & Technology" },
  { value: "medical", label: "Medical Equipment" },
  { value: "office", label: "Office Supplies" },
  { value: "transport", label: "Transport" },
  { value: "energy", label: "Energy" },
  { value: "education", label: "Education" },
  { value: "consulting", label: "Consulting" },
];

const Subscriptions = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<{
    name: string;
    priceId: string;
    categoryLimit?: number;
  } | null>(null);

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
    } else if (success === 'false') {
      toast({
        title: "Subscription cancelled",
        description: "Your subscription was not completed.",
        variant: "destructive",
      });
    }
  }, [searchParams, toast]);

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

      // For Enterprise plan, proceed directly to payment
      if (plan.name === "Enterprise") {
        proceedToPayment(plan.name, plan.priceId);
        return;
      }

      // For other plans, open category selection dialog
      setSelectedPlan(plan);
      setSelectedCategories(profile?.preferred_categories || []);
      setIsDialogOpen(true);
    } catch (error: any) {
      console.error('Subscription error:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to process subscription",
      });
    }
  };

  const proceedToPayment = async (planName: string, priceId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-subscription', {
        body: {
          plan: planName,
          priceId: priceId,
          userId: session!.user.id,
          backUrl: window.location.href,
          categories: selectedCategories
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

  const handleConfirmCategories = async () => {
    if (!selectedPlan) return;

    if (selectedCategories.length > (selectedPlan.categoryLimit || Infinity)) {
      toast({
        variant: "destructive",
        title: "Too many categories",
        description: `You can only select up to ${selectedPlan.categoryLimit} categories with the ${selectedPlan.name} plan.`,
      });
      return;
    }

    setIsDialogOpen(false);
    await proceedToPayment(selectedPlan.name, selectedPlan.priceId);
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Select Your Categories</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <MultiSelect
              options={CATEGORIES}
              selectedValues={selectedCategories}
              onChange={setSelectedCategories}
              label={`Select up to ${selectedPlan?.categoryLimit} categories`}
            />
            {selectedCategories.length > (selectedPlan?.categoryLimit || Infinity) && (
              <p className="text-red-500 text-sm mt-2">
                You can only select up to {selectedPlan?.categoryLimit} categories with the {selectedPlan?.name} plan.
              </p>
            )}
          </div>
          <div className="flex justify-end gap-4">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmCategories}>
              Continue to Payment
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
};

export default Subscriptions;
