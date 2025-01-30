import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navigation from "@/components/Navigation";
import { useIsMobile } from "@/hooks/use-mobile";

const TenderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  // Mock data for now - this would be fetched from Supabase in a real implementation
  const tender = {
    title: "Travaux de réalisation en tce 300 lpa et 48 lpl",
    organization: "AADL Agence Nationale de l'Amélioration et du Développement du Logement",
    region: "Mascara",
    publicationDate: "15/12/2024",
    deadline: "15/01/2024",
    specifications_price: "5000.00 DA",
    withdrawal_address: "La direction régionale AADL Rest , cité 500 logements bâtimente 16 , Kaid Ahmed - Tiaret",
    image_url: "/lovable-uploads/72bb512e-6a19-42f7-a234-ebd4c3510fef.png"
  };

  return (
    <div className={`${isMobile ? 'pb-20' : 'pt-24'}`}>
      <Navigation />
      
      <div className="container mx-auto px-4 py-8">
        <Button
          variant="ghost"
          className="mb-6"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="max-w-4xl mx-auto bg-background rounded-lg shadow-lg overflow-hidden">
          <div className="p-6">
            <h1 className="text-2xl font-semibold text-foreground mb-4">{tender.title}</h1>
            
            <div className="space-y-4 text-muted-foreground">
              <div>
                <h2 className="font-semibold text-foreground">Organization</h2>
                <p>{tender.organization}</p>
              </div>
              
              <div>
                <h2 className="font-semibold text-foreground">Region</h2>
                <p>{tender.region}</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h2 className="font-semibold text-foreground">Publication Date</h2>
                  <p>{tender.publicationDate}</p>
                </div>
                <div>
                  <h2 className="font-semibold text-foreground">Deadline</h2>
                  <p>{tender.deadline}</p>
                </div>
              </div>
              
              <div>
                <h2 className="font-semibold text-foreground">Specifications Price</h2>
                <p>{tender.specifications_price}</p>
              </div>
              
              <div>
                <h2 className="font-semibold text-foreground">Withdrawal Address</h2>
                <p>{tender.withdrawal_address}</p>
              </div>
            </div>

            <div className="mt-8">
              <img 
                src={tender.image_url} 
                alt="Tender Document"
                className="w-full object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenderDetails;