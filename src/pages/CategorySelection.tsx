
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CategorySelection as CategorySelectionComponent } from "@/components/subscriptions/CategorySelection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Browser } from '@capacitor/browser';
import { Capacitor } from '@capacitor/core';

const CategorySelection = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const location = useLocation();

  const { data: subscription, isLoading, error } = useQuery({
    queryKey: ['latest-subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
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
        toast.error('Failed to load subscription data');
        throw error;
      }
      return data;
    },
    staleTime: 0,
    retry: 5,
    retryDelay: 1000
  });

  useEffect(() => {
    const init = async () => {
      // Close browser if coming from payment flow
      if (Capacitor.isNativePlatform() && location.state?.fromPayment) {
        try {
          await Browser.close();
        } catch (error) {
          console.error('Error closing browser:', error);
        }
      }
    };

    init();
  }, [location.state]);

  useEffect(() => {
    if (!session) {
      console.log('No session, redirecting to auth');
      navigate('/auth', { 
        state: { 
          returnTo: location.pathname
        }
      });
      return;
    }

    if (error) {
      console.error('Subscription fetch error:', error);
      toast.error('Failed to load subscription data');
      return;
    }

    if (isLoading) {
      console.log('Loading subscription data...');
      return;
    }

    if (!subscription) {
      console.log('No subscription found, redirecting to subscriptions');
      navigate('/subscriptions');
      return;
    }

    console.log('Current subscription:', subscription);
  }, [session, subscription, navigate, isLoading, error, location.pathname]);

  if (!session || isLoading || !subscription) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className="flex-grow">
        <CategorySelectionComponent 
          subscriptionId={subscription.id} 
          plan={subscription.plan} 
        />
      </div>
      <Footer />
    </div>
  );
};

export default CategorySelection;
