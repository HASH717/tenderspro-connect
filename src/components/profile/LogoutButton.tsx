
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

export const LogoutButton = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // If it's a session error, we can still redirect to auth
        if (error.message.includes('session') || error.status === 403) {
          navigate("/auth");
          return;
        }
        throw error;
      }
      navigate("/auth");
    } catch (error: any) {
      console.error('Error signing out:', error);
      toast.error(t("auth.error.logout"), {
        description: error.message,
      });
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

