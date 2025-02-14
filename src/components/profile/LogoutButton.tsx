
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";

export const LogoutButton = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { session } = useAuth();

  const handleLogout = async () => {
    try {
      // Check if there's an active session before attempting to sign out
      if (!session) {
        console.log('No active session found, redirecting to auth page');
        navigate("/auth");
        return;
      }

      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      navigate("/auth");
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error("Failed to sign out", {
        description: error.message,
      });
      // If we get a session error, redirect to auth page anyway
      if (error.message?.toLowerCase().includes('session')) {
        navigate("/auth");
      }
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleLogout}
      className="bg-red-500 text-white hover:bg-red-600"
    >
      {t("profile.logout")}
    </Button>
  );
};
