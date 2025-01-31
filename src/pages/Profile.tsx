import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQuery } from "@tanstack/react-query";

interface Profile {
  first_name: string;
  last_name: string;
  phone_number: string;
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
  });
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  // Fetch subscription data
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
      return data as Subscription;
    }
  });

  useEffect(() => {
    if (!session?.user.id) return;
    
    const getProfile = async () => {
      try {
        setIsLoadingProfile(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone_number")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load profile",
          });
          return;
        }

        if (data) {
          setProfile(data);
          setEmail(session.user.email || "");
        } else {
          toast({
            variant: "destructive",
            title: "Profile Not Found",
            description: "Your profile information could not be found",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    getProfile();
  }, [session?.user.id, session?.user.email, toast]);

  const handleUpdateProfile = async () => {
    if (!session?.user.id) return;
    
    setIsLoading(true);
    try {
      if (email !== session.user.email) {
        const { error: emailError } = await supabase.auth.updateUser({
          email: email,
        });
        if (emailError) throw emailError;
      }

      if (newPassword) {
        const { error: passwordError } = await supabase.auth.updateUser({
          password: newPassword,
        });
        if (passwordError) throw passwordError;
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          phone_number: profile.phone_number,
        })
        .eq("id", session.user.id);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setNewPassword("");
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out",
      });
      return;
    }
    navigate("/auth");
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen pb-20">
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
    <div className="min-h-screen flex flex-col pb-20">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
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
            <TabsList className="w-full">
              <TabsTrigger value="profile" className="flex-1">Profile</TabsTrigger>
              <TabsTrigger value="subscription" className="flex-1">Subscription</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.email")}
                </label>
                <Input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("profile.enterEmail")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.newPassword")} {t("profile.newPasswordHint")}
                </label>
                <Input 
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder={t("profile.newPasswordPlaceholder")}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.firstName")}
                </label>
                <Input 
                  value={profile.first_name}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.lastName")}
                </label>
                <Input 
                  value={profile.last_name}
                  disabled
                  className="bg-gray-100"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("profile.phoneNumber")}
                </label>
                <Input 
                  value={profile.phone_number}
                  onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                  placeholder={t("profile.enterPhoneNumber")}
                />
              </div>
              
              <Button 
                className="w-full" 
                onClick={handleUpdateProfile}
                disabled={isLoading}
              >
                {isLoading ? t("profile.saving") : t("profile.saveChanges")}
              </Button>
            </TabsContent>

            <TabsContent value="subscription">
              <div className="space-y-4">
                <div className="p-6 bg-white rounded-lg border">
                  {subscription ? (
                    <>
                      <h3 className="text-lg font-semibold mb-4">Current Subscription</h3>
                      <div className="space-y-2">
                        <p>
                          <span className="font-medium">Plan:</span>{" "}
                          <span className="text-primary">{subscription.plan}</span>
                        </p>
                        <p>
                          <span className="font-medium">Status:</span>{" "}
                          <span className={`capitalize ${subscription.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                            {subscription.status}
                          </span>
                        </p>
                        <p>
                          <span className="font-medium">Current Period:</span>{" "}
                          {new Date(subscription.current_period_start).toLocaleDateString()} - {new Date(subscription.current_period_end).toLocaleDateString()}
                        </p>
                      </div>
                      <Button 
                        className="mt-4"
                        onClick={() => navigate('/subscriptions')}
                      >
                        Manage Subscription
                      </Button>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-semibold mb-4">No Active Subscription</h3>
                      <p className="text-gray-600 mb-4">
                        You currently don't have an active subscription. Subscribe to access more features.
                      </p>
                      <Button 
                        onClick={() => navigate('/subscriptions')}
                      >
                        View Plans
                      </Button>
                    </>
                  )}
                </div>
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
