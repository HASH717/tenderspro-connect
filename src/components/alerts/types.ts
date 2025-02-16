
export interface Alert {
  id: string;
  name: string;
  wilaya: string[];
  tenderType: string[];
  category: string[];
  notification_preferences?: {
    email: boolean;
    in_app: boolean;
  };
}

export const mapFiltersToDb = (filters: Partial<Alert>, userId: string) => {
  // Store just the wilaya numbers for consistent comparison
  const wilayaValues = filters.wilaya?.map(w => {
    if (!w) return ''; // Handle null/undefined wilaya
    // Extract the number part before the dash
    const parts = w.split(' - ');
    // Return just the number part
    return parts[0].trim();
  }).filter(Boolean) || []; // Remove empty strings

  return {
    ...(filters.id && { id: filters.id }),
    user_id: userId,
    name: filters.name,
    wilaya: wilayaValues.length > 0 ? wilayaValues.join(",") : null,
    tender_type: filters.tenderType && filters.tenderType.length > 0 ? filters.tenderType.join(",") : null,
    category: filters.category && filters.category.length > 0 ? filters.category.join("|||") : null,
    notification_preferences: filters.notification_preferences || { email: false, in_app: true }
  };
};

export const mapDbToFilters = (dbAlert: any): Alert => {
  // Split the wilaya string and map to full format
  const wilayas = dbAlert.wilaya ? dbAlert.wilaya.split(",").map(wilayaNumber => {
    if (!wilayaNumber) return ''; // Handle null/undefined wilaya
    // Find the matching full wilaya string from WILAYA_OPTIONS
    const matchingOption = WILAYA_OPTIONS.find(opt => {
      const number = opt.split(' - ')[0].trim();
      return number === wilayaNumber.trim();
    });
    return matchingOption || wilayaNumber; // Return full format if found, otherwise original value
  }).filter(Boolean) : []; // Remove empty strings

  const tenderType = dbAlert.tender_type ? dbAlert.tender_type.split(",") : [];
  const category = dbAlert.category ? dbAlert.category.split("|||") : [];
  
  return {
    id: dbAlert.id,
    name: dbAlert.name,
    wilaya: wilayas,
    tenderType,
    category,
    notification_preferences: dbAlert.notification_preferences
  };
};

export const WILAYA_OPTIONS = [
  "1 - Adrar", "2 - Chlef", "3 - Laghouat", "4 - Oum El Bouaghi", "5 - Batna",
  "6 - Béjaïa", "7 - Biskra", "8 - Béchar", "9 - Blida", "10 - Bouira",
  "11 - Tamanrasset", "12 - Tébessa", "13 - Tlemcen", "14 - Tiaret",
  "15 - Tizi-Ouzou", "16 - Alger", "17 - Djelfa", "18 - Jijel", "19 - Sétif",
  "20 - Saida", "21 - Skikda", "22 - Sidi-Bel-Abbès", "23 - Annaba",
  "24 - Guelma", "25 - Constantine", "26 - Médéa", "27 - Mostaganem",
  "28 - M'Sila", "29 - Mascara", "30 - Ouargla", "31 - Oran", "32 - El-Bayadh",
  "33 - Illizi", "34 - Bordj-Bou-Arreridj", "35 - Boumerdès", "36 - El-Tarf",
  "37 - Tindouf", "38 - Tissemsilt", "39 - El-Oued", "40 - Khenchela",
  "41 - Souk-Ahras", "42 - Tipaza", "43 - Mila", "44 - Aïn-Defla", "45 - Naâma",
  "46 - Aïn-Témouchent", "47 - Ghardaia", "48 - Relizane", "49 - Timimoun",
  "50 - Bordj Badji Mokhtar", "51 - Ouled Djellal", "52 - Béni Abbès",
  "53 - In Salah", "54 - In Guezzam", "55 - Touggourt", "56 - Djanet",
  "57 - El M'Ghair", "58 - El Meniaa"
];
