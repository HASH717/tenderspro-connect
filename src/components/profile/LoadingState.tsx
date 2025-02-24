import { useTranslation } from "react-i18next";
import Navigation from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";

export const ProfileLoadingState = () => {
  const { t } = useTranslation();
  const isMobile = useIsMobile();

  return (
    <div className="min-h-screen">
      <Navigation />
      <div className={`p-4 ${isMobile ? "pt-6" : "pt-24"}`}>
        <h1 className="text-2xl font-bold text-primary mb-4">{t("pages.profile")}</h1>
        <div className="flex justify-center items-center h-48">
          <p>{t("profile.loading")}</p>
        </div>
      </div>
    </div>
  );
};
