import { corsHeaders } from './cors.ts'

export interface TenderData {
  id: number;
  title: string;
  region_verbose?: { name: string };
  expiration_date?: string;
  categories_verbose?: { name: string }[];
  publishing_date?: string;
  cc_price?: number;
  type?: string;
  cc_address?: string;
  files_verbose?: string[];
  tender_number?: string;
  qualification_required?: string;
  qualification_details?: string;
  description?: string;
  organization?: {
    name: string;
    address: string;
  };
  status?: string;
}

export const formatTenderData = (tender: TenderData, detailData: any) => {
  const formatImageUrl = (path: string | null) => {
    if (!path) return null;
    return `https://old.dztenders.com/${path}`;
  };

  const imageUrls = tender.files_verbose?.map(formatImageUrl).filter(Boolean) || [];
  const primaryImageUrl = imageUrls[0] || null;

  return {
    title: tender.title || 'Untitled Tender',
    wilaya: tender.region_verbose?.name || 'Unknown',
    deadline: tender.expiration_date ? new Date(tender.expiration_date).toISOString() : null,
    category: tender.categories_verbose?.[0]?.name || null,
    publication_date: tender.publishing_date ? new Date(tender.publishing_date).toISOString() : null,
    specifications_price: tender.cc_price?.toString() || null,
    tender_id: tender.id?.toString(),
    type: tender.type || null,
    region: tender.region_verbose?.name || null,
    withdrawal_address: tender.cc_address || null,
    link: tender.files_verbose?.[0] || null,
    image_url: primaryImageUrl,
    tender_number: detailData.tender_number || null,
    qualification_required: detailData.qualification_required || null,
    qualification_details: detailData.qualification_details || null,
    project_description: detailData.description || null,
    organization_name: detailData.organization?.name || null,
    organization_address: detailData.organization?.address || null,
    tender_status: detailData.status || null,
    original_image_url: tender.files_verbose?.[0] || null
  };
};

export const fetchTenderDetails = async (tenderId: number, authHeader: string) => {
  const response = await fetch(`https://api.dztenders.com/tenders/${tenderId}/?format=json`, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch tender details: ${response.status}`);
  }

  return response.json();
};

export const fetchTendersPage = async (page: number, authHeader: string) => {
  const response = await fetch(`https://api.dztenders.com/tenders/?format=json&page=${page}`, {
    headers: {
      'Authorization': authHeader,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch page ${page}: ${response.status}`);
  }

  return response.json();
};

export const handleError = (error: Error) => {
  console.error('Error in scraper:', error);
  return new Response(
    JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    }), 
    {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    }
  );
};