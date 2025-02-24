import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface ProfileFormProps {
  email: string;
  profile: {
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  setEmail: (email: string) => void;
  setProfile: (profile: any) => void;
  userId: string;
}

export const ProfileForm = ({ email, profile, setEmail, setProfile, userId }: ProfileFormProps) => {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [newPassword, setNewPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleUpdateProfile = async () => {
    if (!userId) return;
    
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (email !== user?.email) {
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
        .eq("id", userId);

      if (profileError) throw profileError;

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });

      setNewPassword("");
    } catch (error: any) {
      console.error('Error updating profile:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to update profile",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
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
    </div>
  );
};
