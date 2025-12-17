export interface Product {
  id: number;
  title: string;
  description: string;
  price: number;
  commission: number;
  category: string;
  image: string;
  images?: string[];
  imageCount?: number;
  status: 'approved' | 'pending' | 'rejected';
  sales: number;
}

export interface User {
  id: number;
  name: string;
  email: string;
  role: 'vendor' | 'affiliate' | 'consumer';
  wallet: number;
}

export interface Application {
  id: number;
  userId: number;
  userName: string;
  email: string;
  role: 'vendor' | 'affiliate';
  status: 'pending' | 'approved' | 'rejected';
  appliedAt: string;
  businessName?: string;
  description?: string;
}


export interface VendorStats {
  revenue: number;
  sales: number;
  products: number;
  pending: number;
}

export interface AffiliateStats {
  commission: number;
  clicks: number;
  conversions: number;
  rate: number;
}
