import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import { AlertsConfig } from "@/components/AlertsConfig";
import { useTranslation } from "react-i18next";
import { useIsMobile } from "@/hooks/use-mobile";

const Alerts = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen flex flex-col pb-20">
      <Navigation />
      <div className={`flex-grow ${isMobile ? "pt-6" : "pt-24"}`}>
        <div className="max-w-4xl mx-auto px-4">
          <AlertsConfig />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Alerts;