import { useState, useEffect } from 'react';
import { LandingPage } from '@/components/landing/LandingPage';
import { LoginPage } from '@/components/auth/LoginPage';
import { SignupPage } from '@/components/auth/SignupPage';
import { VerificationForm } from '@/components/auth/VerificationForm';
import { DashboardNav } from '@/components/dashboard/DashboardNav';
import { VendorDashboard } from '@/components/dashboard/VendorDashboard';
import { AffiliateDashboard } from '@/components/dashboard/AffiliateDashboard';
import { MarketplaceNav } from '@/components/marketplace/MarketplaceNav';
import { ProductCard } from '@/components/marketplace/ProductCard';
import { ProductModal } from '@/components/marketplace/ProductModal';
import { CartDrawer } from '@/components/cart/CartDrawer';
import { CheckoutModal } from '@/components/cart/CheckoutModal';
import { Notification } from '@/components/Notification';
import { useAuth } from '@/hooks/useAuth';
import { useCart, CartProvider } from '@/hooks/useCart';
import { supabase } from '@/integrations/supabase/client';
import { User, Product, VendorStats, AffiliateStats } from '@/types';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';

type View = 'landing' | 'login' | 'signup' | 'verification' | 'dashboard' | 'marketplace';

const IndexContent = () => {
  const { user, loading: authLoading, userRole, signOut } = useAuth();
  const { addToCart, setAffiliateCode } = useCart();
  const [view, setView] = useState<View>('landing');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [notification, setNotification] = useState<string | null>(null);
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  
  // Marketplace filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Real data states
  const [products, setProducts] = useState<Product[]>([]);
  const [rawProducts, setRawProducts] = useState<any[]>([]);
  const [profile, setProfile] = useState<{ full_name: string; wallet_balance: number } | null>(null);
  const [vendorStats, setVendorStats] = useState<VendorStats>({ revenue: 0, sales: 0, products: 0, pending: 0 });
  const [affiliateStats, setAffiliateStats] = useState<AffiliateStats>({ commission: 0, clicks: 0, conversions: 0, rate: 0 });
  const [affiliateLinks, setAffiliateLinks] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(false);

  // Check for affiliate code in URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ref = params.get('ref');
    if (ref) {
      setAffiliateCode(ref);
      // Track click
      supabase
        .from('affiliate_links')
        .select('id, clicks')
        .eq('code', ref)
        .maybeSingle()
        .then(({ data }) => {
          if (data) {
            supabase
              .from('affiliate_links')
              .update({ clicks: (data.clicks || 0) + 1 })
              .eq('id', data.id);
          }
        });
    }
  }, []);

  // Redirect to dashboard if logged in
  useEffect(() => {
    if (user && userRole && view !== 'verification') {
      setView('dashboard');
      fetchUserData();
    }
  }, [user, userRole]);

  const fetchUserData = async () => {
    if (!user) return;
    
    setDataLoading(true);
    try {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('full_name, wallet_balance')
        .eq('id', user.id)
        .single();
      
      if (profileData) {
        setProfile(profileData);
      }

      if (userRole === 'vendor') {
        const { data: vendorProducts } = await supabase
          .from('products')
          .select('*')
          .eq('vendor_id', user.id);

        if (vendorProducts) {
          setRawProducts(vendorProducts);
          const formattedProducts: Product[] = vendorProducts.map(p => ({
            id: parseInt(p.id.substring(0, 8), 16),
            title: p.title,
            description: p.description || '',
            price: p.price,
            commission: p.commission,
            category: p.category,
            image: p.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80',
            images: p.image_urls || [],
            imageCount: p.image_urls?.length || (p.image_url ? 1 : 0),
            status: p.status as 'approved' | 'pending' | 'rejected',
            sales: p.sales,
          }));
          setProducts(formattedProducts);

          const totalSales = vendorProducts.reduce((sum, p) => sum + p.sales, 0);
          const totalRevenue = vendorProducts.reduce((sum, p) => sum + (p.sales * p.price), 0);
          const pendingCount = vendorProducts.filter(p => p.status === 'pending').length;
          
          setVendorStats({
            revenue: totalRevenue,
            sales: totalSales,
            products: vendorProducts.filter(p => p.status === 'approved').length,
            pending: pendingCount,
          });
        }
      } else {
        const { data: approvedProducts } = await supabase
          .from('products')
          .select('*')
          .eq('status', 'approved');

        if (approvedProducts) {
          setRawProducts(approvedProducts);
          const formattedProducts: Product[] = approvedProducts.map(p => ({
            id: parseInt(p.id.substring(0, 8), 16),
            title: p.title,
            description: p.description || '',
            price: p.price,
            commission: p.commission,
            category: p.category,
            image: p.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80',
            images: p.image_urls || [],
            imageCount: p.image_urls?.length || (p.image_url ? 1 : 0),
            status: p.status as 'approved' | 'pending' | 'rejected',
            sales: p.sales,
          }));
          setProducts(formattedProducts);
        }

        // Fetch affiliate links and stats
        const { data: links } = await supabase
          .from('affiliate_links')
          .select('*')
          .eq('affiliate_id', user.id);

        if (links) {
          setAffiliateLinks(links);
          const totalClicks = links.reduce((sum, l) => sum + (l.clicks || 0), 0);
          const totalConversions = links.reduce((sum, l) => sum + (l.conversions || 0), 0);
          const totalCommission = links.reduce((sum, l) => sum + (l.commission_earned || 0), 0);
          
          setAffiliateStats({
            commission: totalCommission,
            clicks: totalClicks,
            conversions: totalConversions,
            rate: totalClicks > 0 ? Math.round((totalConversions / totalClicks) * 100) : 0,
          });
        }
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchMarketplaceProducts = async () => {
    try {
      const { data: approvedProducts } = await supabase
        .from('products')
        .select('*')
        .eq('status', 'approved');

      if (approvedProducts) {
        setRawProducts(approvedProducts);
        const formattedProducts: Product[] = approvedProducts.map(p => ({
          id: parseInt(p.id.substring(0, 8), 16),
          title: p.title,
          description: p.description || '',
          price: p.price,
          commission: p.commission,
          category: p.category,
          image: p.image_url || 'https://images.unsplash.com/photo-1560472354-b33ff0c44a43?w=800&q=80',
          images: p.image_urls || [],
          imageCount: p.image_urls?.length || (p.image_url ? 1 : 0),
          status: p.status as 'approved' | 'pending' | 'rejected',
          sales: p.sales,
        }));
        setProducts(formattedProducts);
      }
    } catch (error) {
      console.error('Error fetching marketplace products:', error);
    }
  };

  const showNotification = (message: string) => {
    setNotification(message);
  };

  const handleLogout = async () => {
    await signOut();
    setView('landing');
    setProfile(null);
    setProducts([]);
    showNotification('Logged out successfully');
  };

  const handleGenerateLink = async (productId: number) => {
    if (!user) return;
    
    // Find the raw product by matching the converted id
    const rawProduct = rawProducts.find(p => parseInt(p.id.substring(0, 8), 16) === productId);
    if (!rawProduct) {
      toast.error('Product not found');
      return;
    }

    // Check if link already exists
    const existingLink = affiliateLinks.find(l => l.product_id === rawProduct.id);
    if (existingLink) {
      const link = `${window.location.origin}?ref=${existingLink.code}`;
      navigator.clipboard.writeText(link);
      toast.success('Affiliate link copied to clipboard!');
      return;
    }

    // Generate unique code
    const code = `${user.id.substring(0, 6)}_${rawProduct.id.substring(0, 6)}_${Date.now().toString(36)}`;

    try {
      const { data, error } = await supabase
        .from('affiliate_links')
        .insert({
          affiliate_id: user.id,
          product_id: rawProduct.id,
          code: code,
        })
        .select()
        .single();

      if (error) throw error;

      setAffiliateLinks(prev => [...prev, data]);
      const link = `${window.location.origin}?ref=${code}`;
      navigator.clipboard.writeText(link);
      toast.success('Affiliate link generated and copied!');
    } catch (error: any) {
      console.error('Error generating link:', error);
      toast.error(error.message || 'Failed to generate link');
    }
  };

  const handleAddToCart = (productId: number) => {
    const product = products.find(p => p.id === productId);
    const rawProduct = rawProducts.find(p => parseInt(p.id.substring(0, 8), 16) === productId);
    
    if (product && rawProduct) {
      addToCart({
        id: rawProduct.id,
        title: product.title,
        price: product.price,
        image: product.image,
        commission: product.commission,
        vendorId: rawProduct.vendor_id,
      });
      toast.success('Added to cart!');
    }
  };

  const handleBuyProduct = () => {
    if (selectedProduct) {
      const rawProduct = rawProducts.find(p => parseInt(p.id.substring(0, 8), 16) === selectedProduct.id);
      if (rawProduct) {
        addToCart({
          id: rawProduct.id,
          title: selectedProduct.title,
          price: selectedProduct.price,
          image: selectedProduct.image,
          commission: selectedProduct.commission,
          vendorId: rawProduct.vendor_id,
        });
      }
    }
    setSelectedProduct(null);
    setCartOpen(true);
  };

  const handleNavigate = (newView: string) => {
    if (newView === 'marketplace') {
      fetchMarketplaceProducts();
    }
    setView(newView as View);
  };

  const currentUser: User | null = user && profile ? {
    id: parseInt(user.id.substring(0, 8), 16),
    name: profile.full_name || user.email?.split('@')[0] || 'User',
    email: user.email || '',
    role: userRole || 'vendor',
    wallet: profile.wallet_balance || 0,
  } : null;

  // Get categories from products
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (view === 'landing') {
    return (
      <>
        <LandingPage products={products} onNavigate={handleNavigate} onLogin={() => handleNavigate('login')} />
        {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      </>
    );
  }

  if (view === 'login') {
    return (
      <>
        <LoginPage onNavigate={handleNavigate} />
        {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      </>
    );
  }

  if (view === 'signup') {
    return (
      <>
        <SignupPage
          onNavigate={handleNavigate}
          onSignupSuccess={(userId) => {
            setPendingUserId(userId);
            setView('verification');
          }}
        />
        {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      </>
    );
  }

  if (view === 'verification') {
    const userId = pendingUserId || user?.id;
    if (!userId) {
      setView('login');
      return null;
    }

    return (
      <>
        <VerificationForm
          userId={userId}
          onComplete={() => {
            if (user) {
              showNotification('Verification complete!');
              setView('dashboard');
              fetchUserData();
            } else {
              showNotification('Verification complete! Please log in.');
              setView('login');
              setPendingUserId(null);
            }
          }}
        />
        {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      </>
    );
  }

  if (view === 'dashboard' && currentUser) {
    return (
      <div className="min-h-screen bg-background">
        <DashboardNav currentUser={currentUser} onLogout={handleLogout} />
        <div className="p-4 sm:p-6 lg:p-8">
          {dataLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : userRole === 'vendor' ? (
            <VendorDashboard
              currentUser={currentUser}
              products={products}
              stats={vendorStats}
              onVerify={() => setView('verification')}
              onProductAdded={fetchUserData}
            />
          ) : (
            <AffiliateDashboard
              currentUser={currentUser}
              products={products}
              stats={affiliateStats}
              onGenerateLink={handleGenerateLink}
              onVerify={() => setView('verification')}
            />
          )}
        </div>
        {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      </div>
    );
  }

  if (view === 'marketplace') {
    return (
      <div className="min-h-screen bg-background">
        <MarketplaceNav
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          categories={categories}
          onCartClick={() => setCartOpen(true)}
          onLogin={() => handleNavigate('login')}
        />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <p className="text-muted-foreground">No products found</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredProducts.map((product, index) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onAddToCart={handleAddToCart}
                  onClick={setSelectedProduct}
                  index={index}
                />
              ))}
            </div>
          )}
        </div>
        {selectedProduct && (
          <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} onBuy={handleBuyProduct} />
        )}
        <CartDrawer
          isOpen={cartOpen}
          onClose={() => setCartOpen(false)}
          onCheckout={() => {
            setCartOpen(false);
            setCheckoutOpen(true);
          }}
        />
        <CheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          onSuccess={() => {
            setCheckoutOpen(false);
            toast.success('Order placed successfully!');
          }}
        />
        {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
      </div>
    );
  }

  return null;
};

const Index = () => {
  return (
    <CartProvider>
      <IndexContent />
    </CartProvider>
  );
};

export default Index;
