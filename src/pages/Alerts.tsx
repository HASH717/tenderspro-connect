import Navigation from "@/components/Navigation";
import { AlertsConfig } from "@/components/AlertsConfig";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

const Alerts = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen pb-20">
      <div className={`p-4 ${isMobile ? "pt-6" : "pt-24"}`}>
        <AlertsConfig />
      </div>
      <Navigation />
    </div>
  );
};

export default Alerts;