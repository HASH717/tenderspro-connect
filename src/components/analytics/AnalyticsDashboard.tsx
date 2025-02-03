import { useEffect, useState } from "react";
import { Users, DollarSign, TrendingDown, Activity } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { AlgeriaMap } from "./AlgeriaMap";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

interface AnalyticsMetrics {
  total_users: number;
  active_users: number;
  total_revenue: number;
  churn_rate: number;
}

interface WilayaDistribution {
  wilaya: string;
  user_count: number;
}

export const AnalyticsDashboard = () => {
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

      if (metricsError) {
        console.error('Error fetching metrics:', metricsError);
        return;
      }

      const { data: wilayaData, error: wilayaError } = await supabase
        .from('wilaya_distribution')
        .select('*');

      if (wilayaError) {
        console.error('Error fetching wilaya distribution:', wilayaError);
        return;
      }

      setMetrics(metricsData);
      setWilayaData(wilayaData || []);
    };

    fetchAnalytics();

    // Set up real-time subscription
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

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto px-4">
      <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
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

      <Card className="p-4">
        <h3 className="text-lg font-semibold mb-4">User Distribution by Wilaya</h3>
        <AlgeriaMap data={wilayaData} />
      </Card>
    </div>
  );
};