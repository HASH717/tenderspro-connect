import { Users, DollarSign, TrendingDown, Activity } from "lucide-react";
import { MetricCard } from "./MetricCard";
import { AlgeriaMap } from "./AlgeriaMap";
import { Card } from "@/components/ui/card";

export const AnalyticsDashboard = () => {
  // Mock data - in a real app, this would come from your Supabase database
  const metrics = {
    totalUsers: 1234,
    revenue: "43,630 DZD",
    churnRate: "0.73%",
    activeUsers: 892
  };

  const wilayaData = [
    { name: "Alger", users: 450 },
    { name: "Oran", users: 280 },
    { name: "Constantine", users: 180 },
    // Add more wilayas as needed
  ];

  return (
    <div className="space-y-4 w-full max-w-5xl mx-auto px-4">
      <h2 className="text-2xl font-bold tracking-tight">Analytics Dashboard</h2>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Total Users"
          value={metrics.totalUsers}
          icon={<Users className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Total Revenue"
          value={metrics.revenue}
          icon={<DollarSign className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Churn Rate"
          value={metrics.churnRate}
          icon={<TrendingDown className="h-4 w-4 text-muted-foreground" />}
        />
        <MetricCard
          title="Active Users"
          value={metrics.activeUsers}
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