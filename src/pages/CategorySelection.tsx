import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { CategorySelection as CategorySelectionComponent } from "@/components/subscriptions/CategorySelection";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const CategorySelection = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const location = useLocation();
  
  // Parse URL parameters correctly
  const searchParams = new URLSearchParams(location.search);
  const success = searchParams.get('success');
  const plan = searchParams.get('plan');
  const checkoutId = searchParams.get('checkout_id');

  const { data: subscription } = useQuery({
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

      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (!session) {
      navigate('/auth');
      return;
    }

    // If we have success=true in URL and a valid subscription, redirect to home
    if (success === 'true' && checkoutId && subscription) {
      navigate('/');
      return;
    }

    // If no subscription or plan, redirect to subscriptions page
    if (!subscription) {
      navigate('/subscriptions');
      return;
    }
  }, [session, success, checkoutId, subscription, navigate]);

  if (!subscription) {
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