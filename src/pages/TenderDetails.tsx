
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Building, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Separator } from "@/components/ui/separator";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import Footer from "@/components/Footer";
import { useState } from "react";

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);

  const { data: tender, isLoading } = useQuery({
    queryKey: ['tender', id],
    queryFn: async () => {
      if (!id) {
        toast.error('Invalid tender ID');
        navigate('/');
        return null;
      }

      const { data, error } = await supabase
        .from('tenders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching tender:', error);
        toast.error('Failed to load tender details');
        navigate('/');
        return null;
      }

      if (!data) {
        toast.error('Tender not found');
        navigate('/');
        return null;
      }

      return data;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navigation />
        <div className="flex-grow flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading tender details...</div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!tender) {
    return null; // Navigation is handled in the query
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getImageUrl = (imageUrl: string) => {
    if (imageUrl.startsWith('http')) {
      return imageUrl;
    }
    return `https://old.dztenders.com/${imageUrl.replace(/^\//, '')}`;
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      
      <div className={`flex-grow ${isMobile ? 'pb-20' : 'pt-24'}`}>
        <div className="max-w-4xl mx-auto px-4 py-8">
          <Button
            variant="ghost"
            className="mb-6"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="p-6">
              <div className="mb-6">
                <h1 className="text-2xl font-semibold text-gray-900">{tender.title}</h1>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h2 className="text-lg font-semibold mb-4">Tender Information</h2>
                    <div className="space-y-3">
                      {tender.tender_number && (
                        <div className="flex items-center text-gray-600">
                          <Info className="w-4 h-4 mr-2" />
                          <span>Tender Number: {tender.tender_number}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Building className="w-4 h-4 mr-2" />
                        <span>Category: {tender.category || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        <span>Region: {tender.region || tender.wilaya || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Publication Date: {formatDate(tender.publication_date)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-4 h-4 mr-2" />
                        <span>Deadline: {formatDate(tender.deadline)}</span>
                      </div>
                    </div>
                  </div>

                  <Separator />

                  {(tender.qualification_required || tender.qualification_details) && (
                    <div>
                      <h2 className="text-lg font-semibold mb-4">Qualifications</h2>
                      {tender.qualification_required && (
                        <p className="text-gray-600 mb-2">
                          <strong>Required:</strong> {tender.qualification_required}
                        </p>
                      )}
                      {tender.qualification_details && (
                        <p className="text-gray-600">
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
                      <p className="text-gray-600 whitespace-pre-wrap">
                        {tender.project_description}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {(tender.original_image_url || tender.image_url) && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Tender Document</h2>
                  <div className="relative border rounded-lg overflow-hidden w-full">
                    {!imageError ? (
                      <img 
                        src={getImageUrl(tender.original_image_url || tender.image_url)}
                        alt="Tender Document"
                        className="w-full h-auto object-fill"
                        onError={(e) => {
                          console.error('Image load error:', e);
                          setImageError(true);
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
                        <Info className="w-12 h-12 mb-4" />
                        <p>Unable to load tender document image</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default TenderDetails;
