import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Lock } from "lucide-react";

interface CategorySelectionProps {
  subscriptionId: string;
  plan: string;
}

export const CategorySelection = ({ subscriptionId, plan }: CategorySelectionProps) => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const navigate = useNavigate();
  const { session } = useAuth();

  const maxCategories = plan === 'Basic' ? 3 : plan === 'Professional' ? 10 : null;

  const { data: categories = [] } = useQuery({
    queryKey: ['all-tender-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenders')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        return [];
      }

      const uniqueCategories = Array.from(new Set(data.map(tender => tender.category)))
        .filter(category => category)
        .sort();

      return uniqueCategories;
    }
  });

  const handleCategoryToggle = (category: string) => {
    setSelectedCategories(prev => {
      if (prev.includes(category)) {
        return prev.filter(c => c !== category);
      }
      if (maxCategories && prev.length >= maxCategories) {
        toast.error(`You can only select up to ${maxCategories} categories with your ${plan} plan`);
        return prev;
      }
      return [...prev, category];
    });
  };

  const handleSubmit = async () => {
    try {
      if (!session?.user?.id) return;

      if (maxCategories && selectedCategories.length > maxCategories) {
        toast.error(`You can only select up to ${maxCategories} categories with your ${plan} plan`);
        return;
      }

      const { error } = await supabase
        .from('subscription_categories')
        .insert({
          user_id: session.user.id,
          subscription_id: subscriptionId,
          categories: selectedCategories
        });

      if (error) throw error;

      toast.success('Categories saved successfully');
      navigate('/');
    } catch (error: any) {
      console.error('Error saving categories:', error);
      toast.error(error.message);
    }
  };

  if (plan === 'Enterprise') {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4 pt-24">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Select Your Categories</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">
              Select up to {maxCategories} categories
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  onClick={() => handleCategoryToggle(category)}
                  className="h-auto py-4 px-3 text-sm text-center whitespace-normal"
                  disabled={maxCategories !== null && selectedCategories.length >= maxCategories && !selectedCategories.includes(category)}
                >
                  {category}
                  {maxCategories !== null && selectedCategories.length >= maxCategories && !selectedCategories.includes(category) && (
                    <Lock className="h-4 w-4 ml-2 inline-block" />
                  )}
                </Button>
              ))}
            </div>
          </div>

          <Button 
            onClick={handleSubmit} 
            className="w-full"
            disabled={selectedCategories.length === 0 || (maxCategories !== null && selectedCategories.length > maxCategories)}
          >
            Confirm Selection
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
