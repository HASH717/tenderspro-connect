
import { useTranslation } from "react-i18next";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WilayaSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export const WilayaSelect = ({ value, onChange }: WilayaSelectProps) => {
  const { t } = useTranslation();

  const wilayas = [
    { id: "1", name: "1 - Adrar" },
    { id: "2", name: "2 - Chlef" },
    { id: "3", name: "3 - Laghouat" },
    { id: "4", name: "4 - Oum El Bouaghi" },
    { id: "5", name: "5 - Batna" },
    { id: "6", name: "6 - Béjaïa" },
    { id: "7", name: "7 - Biskra" },
    { id: "8", name: "8 - Béchar" },
    { id: "9", name: "9 - Blida" },
    { id: "10", name: "10 - Bouira" },
    { id: "11", name: "11 - Tamanrasset" },
    { id: "12", name: "12 - Tébessa" },
    { id: "13", name: "13 - Tlemcen" },
    { id: "14", name: "14 - Tiaret" },
    { id: "15", name: "15 - Tizi-Ouzou" },
    { id: "16", name: "16 - Alger" },
    { id: "17", name: "17 - Djelfa" },
    { id: "18", name: "18 - Jijel" },
    { id: "19", name: "19 - Sétif" },
    { id: "20", name: "20 - Saida" },
    { id: "21", name: "21 - Skikda" },
    { id: "22", name: "22 - Sidi-Bel-Abbès" },
    { id: "23", name: "23 - Annaba" },
    { id: "24", name: "24 - Guelma" },
    { id: "25", name: "25 - Constantine" },
    { id: "26", name: "26 - Médéa" },
    { id: "27", name: "27 - Mostaganem" },
    { id: "28", name: "28 - M'Sila" },
    { id: "29", name: "29 - Mascara" },
    { id: "30", name: "30 - Ouargla" },
    { id: "31", name: "31 - Oran" },
    { id: "32", name: "32 - El-Bayadh" },
    { id: "33", name: "33 - Illizi" },
    { id: "34", name: "34 - Bordj-Bou-Arreridj" },
    { id: "35", name: "35 - Boumerdès" },
    { id: "36", name: "36 - El-Tarf" },
    { id: "37", name: "37 - Tindouf" },
    { id: "38", name: "38 - Tissemsilt" },
    { id: "39", name: "39 - El-Oued" },
    { id: "40", name: "40 - Khenchela" },
    { id: "41", name: "41 - Souk-Ahras" },
    { id: "42", name: "42 - Tipaza" },
    { id: "43", name: "43 - Mila" },
    { id: "44", name: "44 - Aïn-Defla" },
    { id: "45", name: "45 - Naâma" },
    { id: "46", name: "46 - Aïn-Témouchent" },
    { id: "47", name: "47 - Ghardaia" },
    { id: "48", name: "48 - Relizane" },
    { id: "49", name: "49 - Timimoun" },
    { id: "50", name: "50 - Bordj Badji Mokhtar" },
    { id: "51", name: "51 - Ouled Djellal" },
    { id: "52", name: "52 - Béni Abbès" },
    { id: "53", name: "53 - In Salah" },
    { id: "54", name: "54 - In Guezzam" },
    { id: "55", name: "55 - Touggourt" },
    { id: "56", name: "56 - Djanet" },
    { id: "57", name: "57 - El M'Ghair" },
    { id: "58", name: "58 - El Meniaa" }
  ];

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="bg-white/80 backdrop-blur-sm border-muted/50">
        <SelectValue placeholder={t("filters.wilaya")} />
      </SelectTrigger>
      <SelectContent>
        {wilayas.map((wilaya) => (
          <SelectItem 
            key={wilaya.id} 
            value={wilaya.id}
          >
            {t(`locations.${wilaya.id}`, wilaya.name)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};
