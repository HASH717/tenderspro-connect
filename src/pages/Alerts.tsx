import Navigation from "@/components/Navigation";
import { Bell } from "lucide-react";
import { useTranslation } from "react-i18next";

const Alerts = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.alerts")}</h1>
        <div className="flex flex-col items-center justify-center mt-20">
          <Bell className="w-16 h-16 text-gray-300 mb-4" />
          <p className="text-gray-500">{t("pages.noAlerts")}</p>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Alerts;