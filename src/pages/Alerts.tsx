import Navigation from "@/components/Navigation";
import { AlertsConfig } from "@/components/AlertsConfig";
import { useTranslation } from "react-i18next";

const Alerts = () => {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4 pt-24">
        <h1 className="text-2xl font-bold text-primary mb-6">{t("pages.alerts")}</h1>
        <AlertsConfig />
      </div>
      <Navigation />
    </div>
  );
};

export default Alerts;