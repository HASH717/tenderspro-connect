import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SubscriptionStatus } from "@/components/subscriptions/SubscriptionStatus";
import { SubscriptionPlans } from "@/components/subscriptions/SubscriptionPlans";

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

  const handleSubscribe = async (plan: any) => {
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

      if (error) throw error;

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
          <SubscriptionStatus subscription={subscription} />

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

          <SubscriptionPlans 
            subscription={subscription}
            onSubscribe={handleSubscribe}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Subscriptions;