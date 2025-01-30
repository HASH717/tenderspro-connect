import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import Navigation from "@/components/Navigation";
import TenderCard from "@/components/TenderCard";

// Mock data for initial development
const mockTenders = [
  {
    id: 1,
    title: "Construction of Public School",
    organization: "Ministry of Education",
    location: "Algiers",
    deadline: "2024-04-01",
  },
  {
    id: 2,
    title: "Hospital Equipment Supply",
    organization: "Ministry of Health",
    location: "Oran",
    deadline: "2024-03-25",
  },
];

const Index = () => {
  const [favorites, setFavorites] = useState<number[]>([]);

  const toggleFavorite = (id: number) => {
    setFavorites((prev) =>
      prev.includes(id)
        ? prev.filter((favId) => favId !== id)
        : [...prev, id]
    );
  };

  return (
    <div className="pb-20">
      <div className="sticky top-0 bg-white z-10 p-4 shadow-sm">
        <div className="flex flex-col items-center mb-4">
          <img 
            src="/lovable-uploads/c1c4772c-d5f0-499c-b16f-ae8dcefaa6c3.png" 
            alt="TendersPro Logo" 
            className="h-12 mb-1"
          />
          <h2 className="text-sm text-gray-600">#1 Algerian Tenders</h2>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search tenders..."
            className="pl-10"
          />
        </div>
      </div>

      <div className="p-4">
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