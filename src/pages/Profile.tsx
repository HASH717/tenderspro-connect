import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";
import { ProfileForm } from "@/components/profile/ProfileForm";
import { SubscriptionInfo } from "@/components/profile/SubscriptionInfo";
import { useLanguage } from "@/contexts/LanguageContext";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface Profile {
  first_name: string;
  last_name: string;
  phone_number: string;
  preferred_categories?: string[];
}

interface Subscription {
  plan: string;
  status: string;
  current_period_start: string;
  current_period_end: string;
}

const Profile = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    phone_number: "",
    preferred_categories: [],
  });
  const [email, setEmail] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useLanguage();

  const { data: subscription, error: subscriptionError } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session?.user?.id)
          .single();

        if (error) throw error;
        return data as Subscription;
      } catch (error: any) {
        console.error('Error fetching subscription:', error);
        return null;
      }
    }
  });

  useEffect(() => {
    if (!session?.user?.id) {
      navigate('/auth');
      return;
    }
    
    const getProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone_number, preferred_categories")
          .eq("id", session.user.id)
          .single();

        if (error) throw error;

        if (data) {
          setProfile(data);
          setEmail(session.user.email || "");
        }
      } catch (error: any) {
        console.error('Error fetching profile:', error);
        toast.error("Failed to load profile data");
      } finally {
        setIsLoadingProfile(false);
      }
    };

    getProfile();
  }, [session?.user?.id, session?.user?.email, toast, navigate]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      navigate("/auth");
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error("Failed to sign out");
    }
  };

  const handleLanguageChange = (value: 'en' | 'fr' | 'ar') => {
    changeLanguage(value);
    toast.success(t("profile.language_updated"));
  };

  if (!session?.user?.id) {
    return null;
  }

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen">
        <Navigation />
        <div className={`p-4 ${isMobile ? "pt-6" : "pt-24"}`}>
          <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.profile")}</h1>
          <div className="flex justify-center items-center h-48">
            <p>{t("profile.loading")}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"} pb-24`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-primary">{t("pages.profile")}</h1>
            <Button 
              variant="outline" 
              onClick={handleLogout}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {t("profile.logout")}
            </Button>
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full mb-6 bg-gray-100 p-1">
              <TabsTrigger 
                value="profile" 
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all"
              >
                {t("profile.tabs.profile")}
              </TabsTrigger>
              <TabsTrigger 
                value="subscription" 
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all"
              >
                {t("profile.tabs.subscription")}
              </TabsTrigger>
              <TabsTrigger 
                value="preferences" 
                className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all"
              >
                {t("profile.tabs.preferences")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4 bg-white p-6 rounded-lg border">
              <ProfileForm 
                email={email}
                profile={profile}
                setEmail={setEmail}
                setProfile={setProfile}
                userId={session.user.id}
              />
            </TabsContent>

            <TabsContent value="subscription" className="bg-white rounded-lg border">
              <SubscriptionInfo 
                subscription={subscription}
                isMobile={isMobile}
              />
            </TabsContent>

            <TabsContent value="preferences" className="bg-white p-6 rounded-lg border space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t("profile.preferences.language")}</h3>
                <RadioGroup
                  value={currentLanguage}
                  onValueChange={(value: 'en' | 'fr' | 'ar') => handleLanguageChange(value)}
                  className="flex flex-col space-y-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="en" id="en" />
                    <Label htmlFor="en">English</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fr" id="fr" />
                    <Label htmlFor="fr">Français</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="ar" id="ar" />
                    <Label htmlFor="ar">العربية</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className="space-y-4">
                <h3 className="text-lg font-medium">{t("profile.preferences.categories")}</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.preferred_categories?.map((category) => (
                    <Badge key={category} variant="secondary">
                      {category}
                    </Badge>
                  ))}
                  {(!profile.preferred_categories || profile.preferred_categories.length === 0) && (
                    <p className="text-sm text-muted-foreground">
                      {t("profile.preferences.no_categories")}
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  onClick={() => navigate('/onboarding')}
                  className="mt-2"
                >
                  {t("profile.preferences.update_categories")}
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;