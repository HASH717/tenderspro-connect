import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import TenderCard from "@/components/TenderCard";
import { useIsMobile } from "@/hooks/use-mobile";
import { useTheme } from "@/contexts/ThemeContext";

const mockTenders = [
  {
    id: "1",
    title: "Travaux de réalisation en tce 300 lpa et 48 lpl",
    organization: "Construction",
    location: "Mascara",
    deadline: "29/12/2024",
    publicationDate: "15/12/2024"
  },
  {
    id: "2",
    title: "Réalisation des 08 logements promotionnels tce + vrd",
    organization: "Construction",
    location: "Sidi-Bel-Abbès",
    deadline: "29/12/2024",
    publicationDate: "15/12/2024"
  },
  {
    id: "3",
    title: "Micro-entreprises Travaux de réalisation d'un lycée type 1000 en 04 lots",
    organization: "Education",
    location: "Tizi-Ouzou",
    deadline: "24/12/2024",
    publicationDate: "15/12/2024"
  },
  {
    id: "4",
    title: "Transport de matériaux",
    organization: "Transport",
    location: "Algiers",
    deadline: "04/01/2025",
    publicationDate: "15/12/2024"
  },
  {
    id: "5",
    title: "Fourniture et transport d'une quantité minimale de 1300 tonnes et quantité de 2500 tonnes de sulfate d'alumine granulé",
    organization: "Chemical Supply",
    location: "Annaba",
    deadline: "29/12/2024",
    publicationDate: "15/12/2024"
  }
];

const Index = () => {
  const [favorites, setFavorites] = useState<string[]>([]);
  const isMobile = useIsMobile();
  const { theme } = useTheme();

  const toggleFavorite = (id: string) => {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((favId) => favId !== id)
        : [...prev, id]
    );
  };

  const logoSrc = theme === 'dark' 
    ? "/lovable-uploads/322d9f00-44ae-4a52-85db-ab74141855f7.png"
    : "/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png";

  return (
    <div className={`${isMobile ? 'pb-20' : 'pt-24'}`}>
      <div className="sticky top-0 bg-background z-10 p-4 shadow-sm">
        {isMobile && (
          <div className="flex flex-col items-center mb-4">
            <img 
              src={logoSrc}
              alt="TendersPro Logo" 
              className="h-12 mb-1"
            />
          </div>
        )}
        <div className="relative max-w-2xl mx-auto">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tenders..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4 max-w-4xl mx-auto">
        {mockTenders.map((tender) => (
          <TenderCard
            key={tender.id}
            {...tender}
            isFavorite={favorites.includes(tender.id)}
            onFavorite={() => toggleFavorite(tender.id)}
          />
        ))}
      </div>

      <Navigation />
    </div>
  );
};

export default Index;