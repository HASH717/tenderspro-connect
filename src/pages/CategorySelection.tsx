import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CategorySelection as CategorySelectionComponent } from "@/components/subscriptions/CategorySelection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const CategorySelection = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const location = useLocation();
  
  // Parse URL parameters correctly
  const searchParams = new URLSearchParams(location.search);
  const success = searchParams.get('success');
  const plan = searchParams.get('plan');

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
    if (!session) {
      console.log('No session, redirecting to auth');
      navigate('/auth');
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

    if (!subscription && success === 'true') {
      console.log('Payment successful but no subscription found, retrying...');
      return; // Let the query retry
    }

    if (!subscription) {
      console.log('No subscription found, redirecting to subscriptions');
      navigate('/subscriptions');
      return;
    }

    if (subscription.plan === 'Enterprise') {
      console.log('Enterprise plan, redirecting to home');
      navigate('/');
      return;
    }

    console.log('Current subscription:', subscription);
  }, [session, success, subscription, navigate, isLoading, error]);

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