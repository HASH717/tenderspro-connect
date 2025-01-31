import { useState, useEffect } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface TenderFiltersProps {
  onSearch: (filters: TenderFilters) => void;
  initialFilters?: TenderFilters | null;
}

export interface TenderFilters {
  search: string;
  announcers: string;
  tenderType: string;
  announcementType: string;
  category: string;
  wilaya: string;
  priceRange: string;
  microEnterprises: boolean;
  publicationDate: string;
  deadlineDate: string;
}

const TenderFilters = ({ onSearch, initialFilters }: TenderFiltersProps) => {
  const [filters, setFilters] = useState<TenderFilters>({
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

  const { t } = useTranslation();
  const { session } = useAuth();

  // Fetch user's subscription and preferred categories
  const { data: userSubscriptionData } = useQuery({
    queryKey: ['subscription-and-categories', session?.user?.id],
    enabled: !!session?.user?.id,
    queryFn: async () => {
      if (!session?.user?.id) return null;

      const { data: subscription, error: subError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', session.user.id)
        .eq('status', 'active')
        .maybeSingle();

      if (subError) {
        console.error('Error fetching subscription:', subError);
        return null;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('preferred_categories')
        .eq('id', session.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching profile:', profileError);
        return null;
      }

      return {
        subscription,
        preferredCategories: profile?.preferred_categories || []
      };
    }
  });

  // Fetch categories based on subscription
  const { data: categories = [] } = useQuery({
    queryKey: ['tender-categories'],
    enabled: true,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('tenders')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching categories:', error);
        toast.error('Failed to load categories');
        return [];
      }

      // Get unique categories and remove nulls
      const uniqueCategories = Array.from(new Set(data.map(tender => tender.category)))
        .filter(category => category)
        .sort();

      // If user has subscription and preferred categories, filter the categories
      if (session?.user?.id && userSubscriptionData?.subscription && userSubscriptionData.preferredCategories.length > 0) {
        return uniqueCategories.filter(category => 
          userSubscriptionData.preferredCategories.includes(category)
        );
      }

      return uniqueCategories;
    }
  });

  useEffect(() => {
    if (initialFilters) {
      setFilters(initialFilters);
    }
  }, [initialFilters]);

  const handleFilterChange = (key: keyof TenderFilters, value: string | boolean) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    onSearch(newFilters);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
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
    };
    setFilters(clearedFilters);
    onSearch(clearedFilters);
  };

  return (
    <div className="space-y-4 bg-gradient-accent p-6 rounded-lg shadow-sm border border-muted/50">
      <div className="relative">
        <Input
          placeholder={t("filters.search")}
          className="bg-white/80 backdrop-blur-sm border-muted/50"
          value={filters.search}
          onChange={(e) => handleFilterChange("search", e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <Select
          value={filters.tenderType}
          onValueChange={(value) => handleFilterChange("tenderType", value)}
        >
          <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
            <SelectValue placeholder={t("filters.tenderType")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="national_call">{t("filters.types.national_call")}</SelectItem>
            <SelectItem value="national_international">{t("filters.types.national_international")}</SelectItem>
            <SelectItem value="sale_notice">{t("filters.types.sale_notice")}</SelectItem>
            <SelectItem value="international_consultation">{t("filters.types.international_consultation")}</SelectItem>
            <SelectItem value="national_consultation">{t("filters.types.national_consultation")}</SelectItem>
            <SelectItem value="expression_interest">{t("filters.types.expression_interest")}</SelectItem>
            <SelectItem value="national_preselection">{t("filters.types.national_preselection")}</SelectItem>
            <SelectItem value="adjudication">{t("filters.types.adjudication")}</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.category}
          onValueChange={(value) => handleFilterChange("category", value)}
        >
          <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
            <SelectValue placeholder={t("filters.category")} />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category} value={category}>
                {t(`tender.categories.${category.toLowerCase()}`, category)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.wilaya}
          onValueChange={(value) => handleFilterChange("wilaya", value)}
        >
          <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
            <SelectValue placeholder={t("filters.wilaya")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="adrar">{t("tender.locations.adrar")}</SelectItem>
            <SelectItem value="alger">{t("tender.locations.alger")}</SelectItem>
            <SelectItem value="annaba">{t("tender.locations.annaba")}</SelectItem>
            <SelectItem value="batna">{t("tender.locations.batna")}</SelectItem>
            <SelectItem value="biskra">{t("tender.locations.biskra")}</SelectItem>
            <SelectItem value="blida">{t("tender.locations.blida")}</SelectItem>
            <SelectItem value="bouira">{t("tender.locations.bouira")}</SelectItem>
            <SelectItem value="tlemcen">{t("tender.locations.tlemcen")}</SelectItem>
            <SelectItem value="tizi_ouzou">{t("tender.locations.tizi_ouzou")}</SelectItem>
            <SelectItem value="djelfa">{t("tender.locations.djelfa")}</SelectItem>
            <SelectItem value="setif">{t("tender.locations.setif")}</SelectItem>
            <SelectItem value="saida">{t("tender.locations.saida")}</SelectItem>
            <SelectItem value="skikda">{t("tender.locations.skikda")}</SelectItem>
            <SelectItem value="constantine">{t("tender.locations.constantine")}</SelectItem>
            <SelectItem value="oran">{t("tender.locations.oran")}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Separator className="my-4 bg-muted/30" />

      <div className="flex flex-col sm:flex-row gap-2">
        <Button 
          variant="outline"
          onClick={handleClearFilters}
          className="w-full sm:w-auto bg-white/80 backdrop-blur-sm hover:bg-white/90"
        >
          {t("filters.clearFilters")}
        </Button>
      </div>
    </div>
  );
};

export default TenderFilters;