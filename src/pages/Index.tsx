import { useState, useEffect } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { useIsMobile } from "@/hooks/use-mobile";
import { AdminScraper } from "@/components/AdminScraper";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { MetricCard } from "@/components/analytics/MetricCard";
import { Users, DollarSign, TrendingDown, Activity } from "lucide-react";

type AnalyticsMetrics = Database['public']['Views']['analytics_metrics']['Row'];
type WilayaDistribution = Database['public']['Views']['wilaya_distribution']['Row'];

const Index = () => {
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const [metrics, setMetrics] = useState<AnalyticsMetrics>({
    total_users: 0,
    active_users: 0,
    total_revenue: 0,
    churn_rate: 0
  });
  const [wilayaData, setWilayaData] = useState<WilayaDistribution[]>([]);

  useEffect(() => {
    const fetchAnalytics = async () => {
      const { data: metricsData, error: metricsError } = await supabase
        .from('analytics_metrics')
        .select('*')
        .single();

      const { data: wilayaData, error: wilayaError } = await supabase
        .from('wilaya_distribution')
        .select('*');

      if (metricsError || wilayaError) {
        console.error('Error fetching analytics:', { metricsError, wilayaError });
        return;
      }

      if (metricsData) setMetrics(metricsData);
      if (wilayaData) setWilayaData(wilayaData);
    };

    fetchAnalytics();

    const channel = supabase
      .channel('analytics-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles'
        },
        () => fetchAnalytics()
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'subscriptions'
        },
        () => fetchAnalytics()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const isAdmin = session?.user.email === "motraxagency@gmail.com";

  if (!isAdmin) {
    return <Navigate to="/auth" />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isMobile ? 'pb-16' : 'pb-12'}`}>
      <Navigation />
      <div className="flex-grow">
        <div className={`bg-background z-10 ${isMobile ? 'pt-6' : 'pt-24'}`}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Dashboard</h2>
            
            <div className="mb-8">
              <AdminScraper />
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
              <MetricCard
                title="Total Users"
                value={metrics.total_users}
                icon={<Users className="h-4 w-4 text-muted-foreground" />}
              />
              <MetricCard
                title="Total Revenue"
                value={`${metrics.total_revenue.toLocaleString()} DZD`}
                icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
              />
              <MetricCard
                title="Churn Rate"
                value={`${metrics.churn_rate.toFixed(2)}%`}
                icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
              />
              <MetricCard
                title="Active Users"
                value={metrics.active_users}
                icon={<Activity className="h-4 w-4 text-muted-foreground" />}
              />
            </div>

            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">User Distribution by Wilaya</h3>
              <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                {wilayaData
                  .sort((a, b) => (b.user_count || 0) - (a.user_count || 0))
                  .map((item) => (
                    <div key={item.wilaya} className="flex justify-between items-center p-3 bg-muted/50 rounded-lg">
                      <span className="font-medium">{item.wilaya}</span>
                      <span className="text-muted-foreground">{item.user_count}</span>
                    </div>
                  ))}
              </div>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Index;