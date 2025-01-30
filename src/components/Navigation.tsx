import { Home, Heart, Bell, User, Moon, Sun } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";
import { Switch } from "@/components/ui/switch";

const Navigation = () => {
  const location = useLocation();
  const isMobile = useIsMobile();
  const { theme, toggleTheme } = useTheme();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Heart, path: "/favorites", label: "Favorites" },
    { icon: Bell, path: "/alerts", label: "Alerts" },
    { icon: User, path: "/profile", label: "Profile" },
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
        </div>
      </nav>
    );
  }

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background border-b border-border px-6 py-4 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <img 
            src="/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png" 
            alt="TendersPro Logo" 
            className="h-8"
          />
        </div>
        <div className="flex items-center space-x-6">
          {navItems.map(({ icon: Icon, path, label }) => (
            <Link
              key={path}
              to={path}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                isActive(path)
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{label}</span>
            </Link>
          ))}
          <div className="flex items-center space-x-2 ml-4">
            <Sun className="h-4 w-4" />
            <Switch
              checked={theme === 'dark'}
              onCheckedChange={toggleTheme}
              className="data-[state=checked]:bg-primary"
            />
            <Moon className="h-4 w-4" />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;