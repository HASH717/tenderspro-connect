
import { Home, Heart, Bell, User, Globe, CreditCard } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { MobileNav } from "./navigation/MobileNav";
import { DesktopNav } from "./navigation/DesktopNav";

interface NavItem {
  icon: any;
  path: string;
  label: string;
  onClick?: () => void;
}

const Navigation = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { session } = useAuth();

  const { data: subscription } = useQuery({
    queryKey: ['subscription', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('subscriptions')
          .select('*')
          .eq('user_id', session?.user?.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error) throw error;
        return data;
      } catch (error: any) {
        console.error('Error fetching subscription:', error);
        toast.error('Failed to load subscription data');
        return null;
      }
    },
    retry: 1
  });

  const isActive = (path: string) => location.pathname === path;
  const shouldShowUpgrade = !isMobile && (!subscription || subscription?.status === 'trial');

  const handleUpgradeClick = () => {
    if (!session) {
      navigate('/auth', { state: { returnTo: '/subscriptions' } });
    } else {
      navigate('/subscriptions');
    }
  };

  const navItems: NavItem[] = [
    { icon: Home, path: "/", label: t("navigation.home") },
    { icon: Heart, path: "/favorites", label: t("navigation.favorites") },
    { icon: Bell, path: "/alerts", label: t("navigation.alerts") },
    { icon: User, path: "/profile", label: t("navigation.profile") },
  ];

  if (shouldShowUpgrade) {
    navItems.push({ 
      icon: CreditCard, 
      onClick: handleUpgradeClick,
      path: session ? "/subscriptions" : "/auth", 
      label: subscription?.status === 'trial' ? "Upgrade (Trial)" : "Get Started"
    });
  }

  const logoSrc = "/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png";

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ];

  const props = {
    navItems,
    isActive,
    languages,
    currentLanguage,
    onLanguageChange: (code: string) => changeLanguage(code as 'en' | 'fr' | 'ar'),
  };

  return isMobile ? (
    <MobileNav {...props} />
  ) : (
    <DesktopNav {...props} logoSrc={logoSrc} />
  );
};

export default Navigation;
