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
  const { plan, subscriptionId } = location.state || {};

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

    if (!plan || !subscription) {
      navigate('/subscriptions');
      return;
    }
  }, [session, plan, subscription, navigate]);

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