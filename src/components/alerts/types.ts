
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
  // Store just the wilaya names (after the "-" if present)
  const wilayaValues = filters.wilaya?.map(w => {
    const parts = w.split(' - ');
    return parts.length > 1 ? parts[1] : w;
  }) || [];

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
  // Split the wilaya string but keep the full format
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
