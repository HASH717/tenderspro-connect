import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
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
import { useQuery } from "@tanstack/react-query";
import { LanguageSelector } from "@/components/onboarding/LanguageSelector";
import { CategorySelector } from "@/components/onboarding/CategorySelector";

const Onboarding = () => {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [maxCategories, setMaxCategories] = useState<number | null>(10);
  const navigate = useNavigate();
  const { toast } = useToast();
  const { session } = useAuth();
  const { changeLanguage } = useLanguage();

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

  useEffect(() => {
    if (subscription) {
      if (subscription.status === 'trial') {
        setMaxCategories(10);
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
    setSelectedCategories(current => {
      const isSelected = current.includes(category);
      
      if (isSelected) {
        return current.filter(c => c !== category);
      }
      
      if (maxCategories && current.length >= maxCategories) {
        toast({
          variant: "destructive",
          title: "Category limit reached",
          description: `Your current plan allows up to ${maxCategories} categories`,
        });
        return current;
      }
      
      return [...current, category];
    });
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

  if (subscription?.plan === 'Enterprise') {
    navigate('/');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle>Welcome to TendersPro</CardTitle>
          <CardDescription>Let's set up your preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <LanguageSelector onLanguageChange={handleLanguageChange} />
          <CategorySelector
            selectedCategories={selectedCategories}
            onCategorySelect={handleCategorySelect}
            maxCategories={maxCategories}
          />
          <Button onClick={handleSubmit} className="w-full">
            Continue
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default Onboarding;