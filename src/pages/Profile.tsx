
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useIsMobile } from "@/hooks/use-mobile";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { ProfileTab } from "@/components/profile/ProfileTab";
import { SubscriptionTab } from "@/components/profile/SubscriptionTab";
import { PreferencesTab } from "@/components/profile/PreferencesTab";
import { LogoutButton } from "@/components/profile/LogoutButton";
import { ProfileLoadingState } from "@/components/profile/LoadingState";

interface Profile {
  first_name: string;
  last_name: string;
  phone_number: string;
  preferred_categories?: string[];
}

const Profile = () => {
  const { t } = useTranslation();
  const { session } = useAuth();
  const isMobile = useIsMobile();
  const navigate = useNavigate();
  const { currentLanguage, changeLanguage } = useLanguage();
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    phone_number: "",
    preferred_categories: [],
  });
  const [email, setEmail] = useState("");
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);

  const { data: subscription } = useQuery({
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
        return data;
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
        toast("Failed to load profile data", {
          description: error.message,
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    getProfile();
  }, [session?.user?.id, session?.user?.email, navigate]);

  const handleLanguageChange = (value: 'en' | 'fr' | 'ar') => {
    changeLanguage(value);
    toast(t("profile.language_updated"));
  };

  if (!session?.user?.id) {
    return null;
  }

  if (isLoadingProfile) {
    return <ProfileLoadingState />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className="sticky top-0 z-50">
        <Navigation />
      </div>
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"} pb-24`}>
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-primary">{t("pages.profile")}</h1>
            <LogoutButton />
          </div>

          <Tabs defaultValue="profile" className="w-full">
            <TabsList className="w-full mb-6 bg-gray-100 p-1 flex space-x-1">
              <TabsTrigger value="profile" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                {t("profile.tabs.profile")}
              </TabsTrigger>
              <TabsTrigger value="subscription" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                {t("profile.tabs.subscription")}
              </TabsTrigger>
              <TabsTrigger value="preferences" className="flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md transition-all">
                {t("profile.tabs.preferences")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <ProfileTab 
                email={email}
                profile={profile}
                setEmail={setEmail}
                setProfile={setProfile}
                userId={session.user.id}
              />
            </TabsContent>

            <TabsContent value="subscription">
              <SubscriptionTab 
                subscription={subscription}
                isMobile={isMobile}
              />
            </TabsContent>

            <TabsContent value="preferences">
              <PreferencesTab 
                currentLanguage={currentLanguage}
                onLanguageChange={handleLanguageChange}
                preferredCategories={profile.preferred_categories}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
