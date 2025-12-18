-- =============================================
-- AFRILINK MARKETPLACE - COMPLETE BACKEND SCHEMA
-- Shared by Main App and Admin Portal
-- =============================================

-- 1. HELPER FUNCTIONS FOR ROLE CHECKING
-- =============================================

-- Check if user is a vendor
CREATE OR REPLACE FUNCTION public.is_vendor(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'vendor'
  )
$$;

-- Check if user is an affiliate
CREATE OR REPLACE FUNCTION public.is_affiliate(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = check_user_id AND role = 'affiliate'
  )
$$;

-- 2. UPDATE EXISTING TABLES
-- =============================================

-- Add vendor role to app_role enum if not exists
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'vendor' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'vendor';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'affiliate' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'affiliate';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'consumer' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'consumer';
  END IF;
END $$;

-- Update profiles table - add business info for vendors
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS business_name text,
ADD COLUMN IF NOT EXISTS business_description text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- Update products table - ensure vendor tracking
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;

-- Update withdrawals table - add payment method details
ALTER TABLE public.withdrawals
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS account_number text,
ADD COLUMN IF NOT EXISTS account_name text,
ADD COLUMN IF NOT EXISTS mobile_provider text,
ADD COLUMN IF NOT EXISTS mobile_number text;

-- 3. CREATE AFFILIATE TRACKING TABLES
-- =============================================

-- Affiliate Links - unique referral links for each product
CREATE TABLE IF NOT EXISTS public.affiliate_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  link_code text NOT NULL UNIQUE,
  clicks integer DEFAULT 0,
  conversions integer DEFAULT 0,
  total_earned integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(affiliate_id, product_id)
);

-- Affiliate Clicks - track each click on affiliate links
CREATE TABLE IF NOT EXISTS public.affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_link_id uuid NOT NULL REFERENCES public.affiliate_links(id) ON DELETE CASCADE,
  ip_address text,
  user_agent text,
  referrer text,
  clicked_at timestamptz DEFAULT now()
);

-- Order Items - individual items in an order with affiliate tracking
CREATE TABLE IF NOT EXISTS public.order_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  affiliate_link_id uuid REFERENCES public.affiliate_links(id) ON DELETE SET NULL,
  quantity integer NOT NULL DEFAULT 1,
  unit_price integer NOT NULL,
  commission_rate integer NOT NULL,
  commission_amount integer NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Affiliate Commissions - track earned commissions
CREATE TABLE IF NOT EXISTS public.affiliate_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  order_item_id uuid NOT NULL REFERENCES public.order_items(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);

-- Add customer_id to orders for tracking
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.profiles(id);

-- 4. ENABLE RLS ON NEW TABLES
-- =============================================

ALTER TABLE public.affiliate_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_commissions ENABLE ROW LEVEL SECURITY;

-- 5. RLS POLICIES FOR PROFILES
-- =============================================

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Public can read basic profile info (for vendor/affiliate pages)
CREATE POLICY "Public can read profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (true);

-- 6. RLS POLICIES FOR PRODUCTS
-- =============================================

-- Vendors can insert their own products
CREATE POLICY "Vendors can insert own products"
ON public.products FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = vendor_id 
  AND is_vendor(auth.uid())
);

-- Vendors can update their own products
CREATE POLICY "Vendors can update own products"
ON public.products FOR UPDATE
TO authenticated
USING (auth.uid() = vendor_id AND is_vendor(auth.uid()))
WITH CHECK (auth.uid() = vendor_id AND is_vendor(auth.uid()));

-- Vendors can delete their own products
CREATE POLICY "Vendors can delete own products"
ON public.products FOR DELETE
TO authenticated
USING (auth.uid() = vendor_id AND is_vendor(auth.uid()));

-- Everyone can read approved products
CREATE POLICY "Anyone can read approved products"
ON public.products FOR SELECT
TO authenticated
USING (status = 'approved' OR vendor_id = auth.uid() OR is_admin(auth.uid()));

-- 7. RLS POLICIES FOR AFFILIATE LINKS
-- =============================================

-- Admins can do everything on affiliate_links
CREATE POLICY "Admins can do everything on affiliate_links"
ON public.affiliate_links FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Affiliates can create their own links
CREATE POLICY "Affiliates can create own links"
ON public.affiliate_links FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = affiliate_id 
  AND is_affiliate(auth.uid())
);

-- Affiliates can read their own links
CREATE POLICY "Affiliates can read own links"
ON public.affiliate_links FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid() OR is_admin(auth.uid()));

-- Affiliates can update their own links
CREATE POLICY "Affiliates can update own links"
ON public.affiliate_links FOR UPDATE
TO authenticated
USING (affiliate_id = auth.uid())
WITH CHECK (affiliate_id = auth.uid());

-- 8. RLS POLICIES FOR AFFILIATE CLICKS
-- =============================================

-- Admins can do everything on affiliate_clicks
CREATE POLICY "Admins can do everything on affiliate_clicks"
ON public.affiliate_clicks FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Anyone can insert clicks (for tracking)
CREATE POLICY "Anyone can insert clicks"
ON public.affiliate_clicks FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Affiliates can read clicks on their links
CREATE POLICY "Affiliates can read own link clicks"
ON public.affiliate_clicks FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.affiliate_links 
    WHERE id = affiliate_link_id AND affiliate_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- 9. RLS POLICIES FOR ORDER ITEMS
-- =============================================

-- Admins can do everything on order_items
CREATE POLICY "Admins can do everything on order_items"
ON public.order_items FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Vendors can read order items for their products
CREATE POLICY "Vendors can read own product order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.products 
    WHERE id = product_id AND vendor_id = auth.uid()
  )
  OR is_admin(auth.uid())
);

-- Affiliates can read order items with their affiliate links
CREATE POLICY "Affiliates can read own referred order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.affiliate_links 
    WHERE id = affiliate_link_id AND affiliate_id = auth.uid()
  )
);

-- Customers can read their own order items
CREATE POLICY "Customers can read own order items"
ON public.order_items FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.orders 
    WHERE id = order_id AND customer_id = auth.uid()
  )
);

-- System can insert order items (via service role)
CREATE POLICY "Service can insert order items"
ON public.order_items FOR INSERT
TO authenticated
WITH CHECK (true);

-- 10. RLS POLICIES FOR AFFILIATE COMMISSIONS
-- =============================================

-- Admins can do everything on affiliate_commissions
CREATE POLICY "Admins can do everything on affiliate_commissions"
ON public.affiliate_commissions FOR ALL
TO authenticated
USING (is_admin(auth.uid()));

-- Affiliates can read their own commissions
CREATE POLICY "Affiliates can read own commissions"
ON public.affiliate_commissions FOR SELECT
TO authenticated
USING (affiliate_id = auth.uid() OR is_admin(auth.uid()));

-- 11. RLS POLICIES FOR ORDERS
-- =============================================

-- Vendors can read orders containing their products
CREATE POLICY "Vendors can read orders with own products"
ON public.orders FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.order_items oi
    JOIN public.products p ON oi.product_id = p.id
    WHERE oi.order_id = orders.id AND p.vendor_id = auth.uid()
  )
  OR customer_id = auth.uid()
  OR is_admin(auth.uid())
);

-- Customers can create orders
CREATE POLICY "Customers can create orders"
ON public.orders FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- 12. RLS POLICIES FOR WITHDRAWALS
-- =============================================

-- Users can create their own withdrawals
CREATE POLICY "Users can create own withdrawals"
ON public.withdrawals FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can read their own withdrawals
CREATE POLICY "Users can read own withdrawals"
ON public.withdrawals FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 13. RLS POLICIES FOR APPLICATIONS
-- =============================================

-- Users can create their own applications
CREATE POLICY "Users can create own applications"
ON public.applications FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Users can read their own applications
CREATE POLICY "Users can read own applications"
ON public.applications FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR is_admin(auth.uid()));

-- 14. INDEXES FOR PERFORMANCE
-- =============================================

CREATE INDEX IF NOT EXISTS idx_affiliate_links_affiliate_id ON public.affiliate_links(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_product_id ON public.affiliate_links(product_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_links_link_code ON public.affiliate_links(link_code);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_link_id ON public.affiliate_clicks(affiliate_link_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_commissions_affiliate_id ON public.affiliate_commissions(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON public.order_items(product_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor_id ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_products_status ON public.products(status);

-- 15. TRIGGERS FOR UPDATED_AT
-- =============================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_affiliate_links_updated_at ON public.affiliate_links;
CREATE TRIGGER update_affiliate_links_updated_at
BEFORE UPDATE ON public.affiliate_links
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 16. FUNCTION TO GENERATE UNIQUE AFFILIATE LINK CODE
-- =============================================

CREATE OR REPLACE FUNCTION public.generate_affiliate_link_code()
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  result text := '';
  i integer;
BEGIN
  FOR i IN 1..8 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::integer, 1);
  END LOOP;
  RETURN result;
END;
$$;