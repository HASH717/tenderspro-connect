import { Home, Heart, Bell, User } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const Navigation = () => {
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { icon: Home, path: "/", label: "Home" },
    { icon: Heart, path: "/favorites", label: "Favorites" },
    { icon: Bell, path: "/alerts", label: "Alerts" },
    { icon: User, path: "/profile", label: "Profile" },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-2">
      <div className="flex justify-around items-center">
        {navItems.map(({ icon: Icon, path, label }) => (
          <Link
            key={path}
            to={path}
            className={`flex flex-col items-center p-2 ${
              isActive(path) ? "text-primary" : "text-gray-500"
            }`}
          >
            <Icon className="w-6 h-6" />
            <span className="text-xs mt-1">{label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
};

export default Navigation;