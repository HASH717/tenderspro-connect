
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { SubscriptionStatus } from "@/components/subscriptions/SubscriptionStatus";
import { SubscriptionPlans } from "@/components/subscriptions/SubscriptionPlans";
import { TestModeAlert } from "@/components/subscriptions/TestModeAlert";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";

const Subscriptions = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { session } = useAuth();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['profile', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session?.user?.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error);
        throw error;
      }
      return data;
    }
  });

  const { data: subscription, refetch: refetchSubscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id && !isRefreshing,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session?.user?.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error('Error fetching subscription:', error);
          throw error;
        }

        return data;
      } catch (error) {
        console.error('Subscription query error:', error);
        return null;
      }
    },
    staleTime: 0,
    gcTime: 0,
    retry: 3,
    retryDelay: 1000
  });

  useEffect(() => {
    const success = searchParams.get('success');
    const plan = searchParams.get('plan');
    const checkoutId = searchParams.get('checkout_id');
    
    const handleSuccessfulPayment = async () => {
      if (success === 'true' && plan && checkoutId) {
        setIsRefreshing(true);
        console.log('Payment successful, refreshing subscription data...');
        
        try {
          await refetchSubscription();
          const { data: latestSubscription } = await supabase
            .from('subscriptions')
            .select('*')
            .eq('user_id', session?.user?.id)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestSubscription) {
            console.log('Latest subscription found:', latestSubscription);
            navigate('/subscriptions/categories', {
              replace: true,
              state: {
                subscriptionId: latestSubscription.id,
                plan: latestSubscription.plan
              }
            });
          } else {
            console.error('No active subscription found after payment');
            toast({
              variant: "destructive",
              title: "Error",
              description: "Subscription not found. Please contact support."
            });
          }
        } catch (error) {
          console.error('Error handling successful payment:', error);
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to process subscription. Please contact support."
          });
        } finally {
          setIsRefreshing(false);
        }
      }
    };

    if (session?.user?.id) {
      handleSuccessfulPayment();
    }
  }, [searchParams, session?.user?.id, navigate, refetchSubscription, toast]);

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
          backUrl: `${window.location.origin}/subscriptions?success=true&plan=${plan.name}`,
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
          <TestModeAlert />
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
