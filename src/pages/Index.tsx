import { useState } from "react";
import { NotificationDemo } from "@/components/NotificationDemo";
import { useTranslation } from "react-i18next";
import { useLanguage } from "@/contexts/LanguageContext";
import TenderFilters from "@/components/TenderFilters";
import TenderList from "@/components/TenderList";
import { TenderFilters as TenderFiltersType } from "@/components/TenderFilters";
import { useTenders } from "@/hooks/use-tenders";

export default function Index() {
  const { t } = useTranslation();
  const { currentLanguage } = useLanguage();
  const [filters, setFilters] = useState<TenderFiltersType>({
    search: "",
    announcers: "",
    tenderType: "",
    announcementType: "",
    category: "",
    wilaya: "",
    priceRange: "",
    microEnterprises: false,
    publicationDate: "",
    deadlineDate: "",
  });

  const { data: tenders, isLoading } = useTenders(filters);

  const handleSearch = (newFilters: TenderFiltersType) => {
    setFilters(newFilters);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationDemo />
      <div className="space-y-6">
        <TenderFilters onSearch={handleSearch} initialFilters={filters} />
        <TenderList tenders={tenders || []} isLoading={isLoading} />
      </div>
    </div>
  );
}