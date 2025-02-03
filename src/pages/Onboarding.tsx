import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";

const Onboarding = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { changeLanguage } = useLanguage();
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxCategories, setMaxCategories] = useState<number | null>(10); // Default to Professional plan limit

  // Fetch user's subscription
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

  // Fetch all available categories
  const { data: categories = [] } = useQuery({
    queryKey: ['all-tender-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenders')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching categories:', error);
        toast({
          variant: "destructive",
          title: "Error",
          description: "Failed to load categories",
        });
        return [];
      }

      const uniqueCategories = Array.from(new Set(data.map(tender => tender.category)))
        .filter(category => category)
        .sort();

      return uniqueCategories;
    }
  });

  // Set category limit based on subscription plan
  useEffect(() => {
    if (subscription) {
      if (subscription.status === 'trial') {
        setMaxCategories(10); // Trial users get Professional plan limit
      } else {
        switch (subscription.plan) {
          case 'Basic':
            setMaxCategories(3);
            break;
          case 'Professional':
            setMaxCategories(10);
            break;
          case 'Enterprise':
            setMaxCategories(null);
            break;
          default:
            setMaxCategories(3);
        }
      }
    }
  }, [subscription]);

  const handleLanguageChange = (value: string) => {
    changeLanguage(value as 'en' | 'fr' | 'ar');
  };

  const handleCategorySelect = (category: string) => {
    if (selectedCategories.includes(category)) {
      setSelectedCategories(selectedCategories.filter((c) => c !== category));
    } else {
      if (maxCategories && selectedCategories.length >= maxCategories) {
        toast({
          variant: "destructive",
          title: "Category limit reached",
          description: `Your current plan allows up to ${maxCategories} categories`,
        });
        return;
      }
      setSelectedCategories([...selectedCategories, category]);
    }
  };

  const handleSubmit = async () => {
    try {
      if (!session?.user?.id) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          preferred_categories: selectedCategories,
        })
        .eq('id', session.user.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your preferences have been saved",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle>Welcome to TendersPro</CardTitle>
          <CardDescription>Let's set up your preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-4">Select your language</h3>
            <Select onValueChange={handleLanguageChange}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a language" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="ar">العربية</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-4">
              Select your preferred categories
              {maxCategories && (
                <span className="text-sm text-muted-foreground ml-2">
                  (Max {maxCategories})
                </span>
              )}
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategories.includes(category) ? "default" : "outline"}
                  onClick={() => handleCategorySelect(category)}
                  className="h-auto py-4 px-3 text-sm text-center whitespace-normal"
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          <Button onClick={handleSubmit} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;