
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
  // Extract wilaya names from the format "number - name"
  const wilayaNames = filters.wilaya?.map(w => w.split(' - ')[1]).filter(Boolean) || [];

  return {
    ...(filters.id && { id: filters.id }),
    user_id: userId,
    name: filters.name,
    wilaya: wilayaNames.length > 0 ? wilayaNames.join(",") : null,
    tender_type: filters.tenderType && filters.tenderType.length > 0 ? filters.tenderType.join(",") : null,
    category: filters.category && filters.category.length > 0 ? filters.category.join("|||") : null,
    notification_preferences: filters.notification_preferences || { email: false, in_app: true }
  };
};

export const mapDbToFilters = (dbAlert: any): Alert => {
  const wilaya = dbAlert.wilaya ? dbAlert.wilaya.split(",") : [];
  const tenderType = dbAlert.tender_type ? dbAlert.tender_type.split(",") : [];
  const category = dbAlert.category ? dbAlert.category.split("|||") : [];
  
  return {
    id: dbAlert.id,
    name: dbAlert.name,
    wilaya,
    tenderType,
    category,
    notification_preferences: dbAlert.notification_preferences
  };
};
