
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
  const wilayaValues = filters.wilaya || [];

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
  // Split the wilaya string into an array of numbers
  const wilayas = dbAlert.wilaya ? dbAlert.wilaya.split(",").map(w => w.trim()) : [];
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
