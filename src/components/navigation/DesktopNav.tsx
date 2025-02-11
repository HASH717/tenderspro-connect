
import { Link } from "react-router-dom";
import { Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface NavItem {
  icon: any;
  path: string;
  label: string;
  onClick?: (e: React.MouseEvent) => void;
}

interface DesktopNavProps {
  navItems: NavItem[];
  isActive: (path: string) => boolean;
  languages: { code: string; label: string; }[];
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
  logoSrc: string;
}

export const DesktopNav = ({ 
  navItems, 
  isActive, 
  languages, 
  currentLanguage,
  onLanguageChange,
  logoSrc 
}: DesktopNavProps) => {
  const currentLanguageLabel = languages.find(lang => lang.code === currentLanguage)?.label || currentLanguage;

  return (
    <nav className="fixed top-0 left-0 right-0 bg-background border-b border-border px-6 py-4 z-50">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        <div className="flex items-center">
          <Link to="/">
            <img src={logoSrc} alt="TendersPro Logo" className="h-8" />
          </Link>
        </div>
        <div className="flex items-center space-x-6">
          {navItems.map(({ icon: Icon, path, label, onClick }) => (
            <Link
              key={path}
              to={path}
              onClick={onClick}
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
                {currentLanguageLabel}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              {languages.map((lang) => (
                <DropdownMenuItem
                  key={lang.code}
                  onClick={() => onLanguageChange(lang.code)}
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
