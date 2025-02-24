import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Calendar, MapPin, Building, Info, CreditCard, MapPinned } from "lucide-react";
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
import { useAuth } from "@/contexts/AuthContext";

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { t } = useTranslation();
  const [imageError, setImageError] = useState(false);
  const { session } = useAuth();

  const { data: tender, isLoading, error } = useQuery({
    queryKey: ['tender', id],
    queryFn: async () => {
      if (!id) {
        toast.error('Invalid tender ID');
        navigate('/');
        return null;
      }

      // Check if user is authenticated
      if (!session?.user) {
        toast.error('Please sign in to view tender details');
        navigate('/auth', { state: { returnTo: `/tenders/${id}` } });
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('tenders')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          throw error;
        }

        if (!data) {
          toast.error('Tender not found or has been removed');
          navigate('/');
          return null;
        }

        return data;
      } catch (error: any) {
        console.error('Error fetching tender:', error);
        if (error.message?.includes('Invalid Refresh Token')) {
          toast.error('Your session has expired. Please sign in again.');
          navigate('/auth', { state: { returnTo: `/tenders/${id}` } });
          return null;
        }
        throw error;
      }
    },
    retry: false
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

  if (error) {
    toast.error('Failed to load tender details');
    navigate('/');
    return null;
  }

  if (!tender) {
    return null;
  }

  const formatDate = (dateString?: string | null) => {
    if (!dateString) return 'Not specified';
    return new Date(dateString).toLocaleDateString();
  };

  const getImageUrl = (tender: any) => {
    if (tender.watermarked_image_url) {
      return tender.watermarked_image_url;
    }
    
    if (tender.image_url) {
      return tender.image_url;
    }

    if (tender.link && !tender.link.startsWith('http')) {
      return `https://old.dztenders.com/${tender.link}`;
    }

    return tender.link;
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
            <ArrowLeft className="mr-2 h-5 w-5" />
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
                    <div className="space-y-4">
                      {tender.tender_number && (
                        <div className="flex items-center text-gray-600">
                          <Info className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span>Tender Number: {tender.tender_number}</span>
                        </div>
                      )}
                      <div className="flex items-center text-gray-600">
                        <Building className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span>Category: {tender.category || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <MapPin className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span>Region: {tender.region || tender.wilaya || 'Not specified'}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span>Publication Date: {formatDate(tender.publication_date)}</span>
                      </div>
                      <div className="flex items-center text-gray-600">
                        <Calendar className="w-5 h-5 mr-3 flex-shrink-0" />
                        <span>Deadline: {formatDate(tender.deadline)}</span>
                      </div>
                      {tender.specifications_price && (
                        <div className="flex items-center text-gray-600">
                          <CreditCard className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span>Specification Price: {tender.specifications_price} DZD</span>
                        </div>
                      )}
                      {tender.withdrawal_address && (
                        <div className="flex items-center text-gray-600">
                          <MapPinned className="w-5 h-5 mr-3 flex-shrink-0" />
                          <span>Withdrawal Address: {tender.withdrawal_address}</span>
                        </div>
                      )}
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

              {!imageError && getImageUrl(tender) && (
                <div className="mt-8">
                  <h2 className="text-lg font-semibold mb-4">Tender Document</h2>
                  <img 
                    src={getImageUrl(tender)}
                    alt="Tender Document"
                    className="w-full h-auto object-contain"
                    onError={() => {
                      console.error("Image failed to load:", getImageUrl(tender));
                      setImageError(true);
                    }}
                  />
                </div>
              )}
              
              {imageError && (
                <div className="mt-8 p-4 border border-gray-200 rounded-lg">
                  <p className="text-gray-600 text-center">
                    The tender document image could not be loaded. Please try again later.
                  </p>
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
