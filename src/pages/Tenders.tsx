import { useState } from "react";
import Navigation from "@/components/Navigation";
import Footer from "@/components/Footer";
import TenderFilters, { TenderFilters as FilterType } from "@/components/TenderFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { TenderList } from "@/components/TenderList";
import { useTenders } from "@/hooks/use-tenders";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";

const Tenders = () => {
  const [filters, setFilters] = useState<FilterType>({
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
  
  const isMobile = useIsMobile();
  const { session } = useAuth();
  const { data: tenders = [], isLoading: isLoadingTenders } = useTenders(filters);

  const handleSearch = (newFilters: FilterType) => {
    console.log('Applying filters:', newFilters);
    setFilters(newFilters);
  };

  const isAdmin = session?.user.email === "motraxagency@gmail.com";

  if (!isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className={`min-h-screen flex flex-col ${isMobile ? 'pb-16' : 'pb-12'}`}>
      <Navigation />
      <div className="flex-grow">
        <div className={`bg-background z-10 ${isMobile ? 'pt-6' : 'pt-24'}`}>
          <div className="max-w-5xl mx-auto px-6">
            <h2 className="text-2xl font-bold tracking-tight mb-8">Tenders Management</h2>
            <TenderFilters onSearch={handleSearch} />
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6">
          <Separator className="my-8" />
        </div>

        <div className="max-w-5xl mx-auto px-6 mb-8">
          <TenderList 
            tenders={tenders} 
            isLoading={isLoadingTenders}
          />
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Tenders;