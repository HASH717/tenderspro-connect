import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Building, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  if (!tender) {
    return <div className="flex items-center justify-center min-h-screen">Tender not found</div>;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <div className={`${isMobile ? 'pb-20' : 'pt-24'} flex-grow`}>
        <Navigation />
        
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="bg-background rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-foreground">{tender.title}</h1>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Tender Information</h2>
                    <div className="space-y-3">
                      {tender.tender_number && (
                        <div className="flex items-center text-muted-foreground">
                          <Info className="w-4 h-4 mr-2" />
                          <span>Tender Number: {tender.tender_number}</span>
                        </div>
                      )}
                      <div className="flex items-center text-muted-foreground">
                        <Building className="w-4 h-4 mr-2" />
                        <span>Category: {tender.category}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Region: {tender.region}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Publication Date: {tender.publication_date}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Deadline: {tender.deadline}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {(tender.qualification_required || tender.qualification_details) && (
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Qualifications</h2>
                      {tender.qualification_required && (
                        <p className="text-muted-foreground mb-2">
                          <strong>Required:</strong> {tender.qualification_required}
                        </p>
                      )}
                      {tender.qualification_details && (
                        <p className="text-muted-foreground">
                          <strong>Details:</strong> {tender.qualification_details}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="space-y-6">
                  {tender.project_description && (
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Project Description</h2>
                      <p className="text-muted-foreground whitespace-pre-wrap">
                        {tender.project_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {tender.image_url && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Tender Document</h2>
                  <img 
                    src={tender.image_url}
                    alt="Tender Document"
                    className="w-full object-contain border rounded-lg"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      
      <footer className="bg-white border-t border-border mt-auto">
        <div className="max-w-7xl mx-auto py-8 px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">About Us</h3>
              <p className="text-muted-foreground">
                Your trusted platform for finding and managing tender opportunities in Algeria.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Contact</h3>
              <p className="text-muted-foreground">Email: contact@tenders-pro.com</p>
              <p className="text-muted-foreground">Phone: +213 555 123 456</p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-muted-foreground hover:text-primary">LinkedIn</a>
                <a href="#" className="text-muted-foreground hover:text-primary">Twitter</a>
                <a href="#" className="text-muted-foreground hover:text-primary">Facebook</a>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} TendersPro. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TenderDetails;