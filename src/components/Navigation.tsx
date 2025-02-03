import { Home, Heart, Bell, User, Globe, CreditCard } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

const Navigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const { currentLanguage, changeLanguage } = useLanguage();
  const { session } = useAuth();

  const { data: subscription, error: subscriptionError } = useQuery({
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

  const navItems = [
    { icon: Home, path: "/", label: t("navigation.home") },
    { icon: Heart, path: "/favorites", label: t("navigation.favorites") },
    { icon: Bell, path: "/alerts", label: t("navigation.alerts") },
    { icon: User, path: "/profile", label: t("navigation.profile") },
  ];

  // Show upgrade button only for no subscription or trial users, and only on desktop
  const shouldShowUpgrade = !isMobile && (!subscription || subscription?.status === 'trial');

  if (shouldShowUpgrade) {
    navItems.push({ 
      icon: CreditCard, 
      path: "/subscriptions", 
      label: subscription?.status === 'trial' ? "Upgrade (Trial)" : "Get Started"
    });
  }

  const logoSrc = "/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png";

  const languages = [
    { code: 'en', label: 'English' },
    { code: 'fr', label: 'Français' },
    { code: 'ar', label: 'العربية' },
  ];

  if (isMobile) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 z-50">
        <div className="flex justify-around items-center">
          {navItems.map(({ icon: Icon, path, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex flex-col items-center p-2 ${
                isActive(path) ? "text-primary" : "text-muted-foreground"
              }`}
            >
              <Icon className="w-6 h-6" />
              <span className="text-xs mt-1">{label}</span>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex flex-col items-center p-2 text-muted-foreground">
              <Globe className="w-6 h-6" />
              <span className="text-xs mt-1">
                {languages.find(lang => lang.code === currentLanguage)?.code.toUpperCase()}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code as 'en' | 'fr' | 'ar')}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background border-b border-border px-6 py-4 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img src={logoSrc} alt="TendersPro Logo" className="h-8" />
        </div>
        <div className="flex items-center space-x-6">
          {navItems.map(({ icon: Icon, path, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                path === '/subscriptions'
                  ? 'bg-green-500 hover:bg-green-600 text-white'
                  : isActive(path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-white"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-accent hover:text-white">
              <Globe className="w-5 h-5" />
              <span className="text-sm font-medium">
                {languages.find(lang => lang.code === currentLanguage)?.label}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => changeLanguage(lang.code as 'en' | 'fr' | 'ar')}
                >
                  {lang.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
