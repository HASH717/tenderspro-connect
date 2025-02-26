
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
  return {
    ...(filters.id && { id: filters.id }),
    user_id: userId,
    name: filters.name,
    wilaya: filters.wilaya && filters.wilaya.length > 0 ? filters.wilaya.join(",") : null,
    tender_type: filters.tenderType && filters.tenderType.length > 0 ? filters.tenderType.join(",") : null,
    category: filters.category && filters.category.length > 0 ? filters.category.join("|||") : null,
    notification_preferences: filters.notification_preferences || { email: false, in_app: true }
  };
};

export const mapDbToFilters = (dbAlert: any): Alert => {
  const wilayas = dbAlert.wilaya ? dbAlert.wilaya.split(",") : [];
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
