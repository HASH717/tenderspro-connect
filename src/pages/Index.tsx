import { useState } from "react";
import Navigation from "@/components/Navigation";
import TenderFilters, { TenderFilters as FilterType } from "@/components/TenderFilters";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { AdminScraper } from "@/components/AdminScraper";
import { useAuth } from "@/contexts/AuthContext";
import { TenderList } from "@/components/TenderList";
import { useTenders } from "@/hooks/use-tenders";

const Index = () => {
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

  const logoSrc = "/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png";

  return (
    <div className={`min-h-screen flex flex-col ${isMobile ? 'pb-32' : 'pb-24'}`}>
      <Navigation />
      <div className={`flex-grow ${isMobile ? '' : 'mt-20'}`}>
        <div className="bg-background z-10">
          <div className="max-w-4xl mx-auto px-4">
            {isMobile && (
              <div className="flex flex-col items-center mb-4">
                <img 
                  src={logoSrc}
                  alt="TendersPro Logo" 
                  className="h-12 mb-1"
                />
              </div>
            )}
            {session?.user.email === "motraxagency@gmail.com" && (
              <div className="mb-6">
                <AdminScraper />
              </div>
            )}
            <TenderFilters onSearch={handleSearch} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <Separator className="my-6" />
        </div>

        <div className="max-w-4xl mx-auto px-4">
          <TenderList 
            tenders={tenders} 
            isLoading={isLoadingTenders}
          />
        </div>
      </div>
      
      <footer className="w-full py-6 mt-auto bg-background border-t">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} TendersPro. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;