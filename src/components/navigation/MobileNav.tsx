
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
  onClick?: () => void;
}

interface MobileNavProps {
  navItems: NavItem[];
  isActive: (path: string) => boolean;
  languages: { code: string; label: string; }[];
  currentLanguage: string;
  onLanguageChange: (code: string) => void;
}

export const MobileNav = ({ 
  navItems, 
  isActive, 
  languages, 
  currentLanguage,
  onLanguageChange 
}: MobileNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-background border-t border-border px-4 py-2 z-50">
      <div className="flex justify-around items-center">
        {navItems.map(({ icon: Icon, path, label, onClick }) => (
          <Link
            key={path}
            to={path}
            onClick={onClick}
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
                onClick={() => onLanguageChange(lang.code)}
              >
                {lang.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </nav>
  );
};
