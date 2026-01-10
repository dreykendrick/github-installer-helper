import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link2, Copy, TrendingUp, DollarSign, MousePointer, ShoppingCart, LogOut, ExternalLink, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { formatCurrency } from '@/utils/currency';

interface AffiliateLink {
  id: string;
  link_code: string;
  clicks: number;
  conversions: number;
  total_earned: number;
  is_active: boolean;
  created_at: string;
  product: {
    id: string;
    title: string;
    price: number;
    commission: number;
    image_url: string;
  };
}

interface Product {
  id: string;
  title: string;
  price: number;
  commission: number;
  image_url: string;
  category: string;
}

interface AffiliateStats {
  totalLinks: number;
  totalClicks: number;
  totalConversions: number;
  totalEarned: number;
}

const AffiliateDashboard = () => {
  const { user, loading, isAffiliate, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [affiliateLinks, setAffiliateLinks] = useState<AffiliateLink[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<AffiliateStats>({
    totalLinks: 0,
    totalClicks: 0,
    totalConversions: 0,
    totalEarned: 0,
  });
  const [creatingLink, setCreatingLink] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'links' | 'products'>('links');

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (!isAffiliate) {
        navigate('/dashboard');
      }
    }
  }, [user, loading, isAffiliate, navigate]);

  useEffect(() => {
    if (user && isAffiliate) {
      fetchAffiliateLinks();
      fetchAvailableProducts();
    }
  }, [user, isAffiliate]);

  const fetchAffiliateLinks = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('affiliate_links')
      .select(`
        *,
        product:products(id, title, price, commission, image_url)
      `)
      .eq('affiliate_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching affiliate links:', error);
    } else {
      const links = data || [];
      setAffiliateLinks(links);
      
      // Calculate stats
      setStats({
        totalLinks: links.length,
        totalClicks: links.reduce((sum, l) => sum + (l.clicks || 0), 0),
        totalConversions: links.reduce((sum, l) => sum + (l.conversions || 0), 0),
        totalEarned: links.reduce((sum, l) => sum + (l.total_earned || 0), 0),
      });
    }
  };

  const fetchAvailableProducts = async () => {
    const { data, error } = await supabase
      .from('products')
      .select('id, title, price, commission, image_url, category')
      .eq('status', 'approved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      setAvailableProducts(data || []);
    }
  };

  const createAffiliateLink = async (productId: string) => {
    if (!user) return;
    
    setCreatingLink(productId);
    
    try {
      // Generate link code using database function
      const { data: codeData, error: codeError } = await supabase
        .rpc('generate_affiliate_link_code');
      
      if (codeError) throw codeError;
      
      const { error } = await supabase
        .from('affiliate_links')
        .insert({
          affiliate_id: user.id,
          product_id: productId,
          link_code: codeData,
        });

      if (error) throw error;

      toast({
        title: 'Link created!',
        description: 'Your affiliate link is ready to share',
      });
      
      fetchAffiliateLinks();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create affiliate link',
        variant: 'destructive',
      });
    } finally {
      setCreatingLink(null);
    }
  };

  const copyLink = (linkCode: string) => {
    const url = `${window.location.origin}/p?ref=${linkCode}`;
    navigator.clipboard.writeText(url);
    toast({
      title: 'Copied!',
      description: 'Affiliate link copied to clipboard',
    });
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const hasExistingLink = (productId: string) => {
    return affiliateLinks.some(link => link.product?.id === productId);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Affiliate Dashboard</h1>
            <p className="text-sm text-muted-foreground">Track your earnings & links</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => navigate('/profile')}>
              <User className="w-4 h-4" />
            </Button>
            <Button variant="outline" size="icon" onClick={handleSignOut}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Link2 className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalLinks}</p>
                  <p className="text-xs text-muted-foreground">Active Links</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <MousePointer className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalClicks}</p>
                  <p className="text-xs text-muted-foreground">Total Clicks</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <ShoppingCart className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalConversions}</p>
                  <p className="text-xs text-muted-foreground">Conversions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <DollarSign className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{formatCurrency(stats.totalEarned / 100)}</p>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <Button
            variant={activeTab === 'links' ? 'default' : 'outline'}
            onClick={() => setActiveTab('links')}
          >
            My Links
          </Button>
          <Button
            variant={activeTab === 'products' ? 'default' : 'outline'}
            onClick={() => setActiveTab('products')}
          >
            Browse Products
          </Button>
        </div>

        {/* Content */}
        {activeTab === 'links' ? (
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Your Affiliate Links</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {affiliateLinks.length === 0 ? (
                <div className="p-8 text-center">
                  <Link2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No affiliate links yet</h3>
                  <p className="text-muted-foreground mb-4">Browse products and create your first link</p>
                  <Button onClick={() => setActiveTab('products')}>
                    Browse Products
                  </Button>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {affiliateLinks.map((link) => (
                    <div key={link.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {link.product?.image_url ? (
                          <img src={link.product.image_url} alt={link.product?.title} className="w-full h-full object-cover" />
                        ) : (
                          <Link2 className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{link.product?.title}</h4>
                        <p className="text-xs text-muted-foreground">
                          {link.clicks} clicks • {link.conversions} sales • {link.product?.commission}% commission
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-green-500">{formatCurrency((link.total_earned || 0) / 100)}</p>
                        <p className="text-xs text-muted-foreground">earned</p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyLink(link.link_code)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card border-border">
            <CardHeader className="border-b border-border">
              <CardTitle className="text-lg">Available Products</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {availableProducts.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  No products available for promotion yet
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {availableProducts.map((product) => (
                    <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                      <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                        {product.image_url ? (
                          <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                        ) : (
                          <TrendingUp className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-foreground truncate">{product.title}</h4>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-foreground font-medium">{formatCurrency(product.price / 100)}</span>
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                            {product.commission}% commission
                          </Badge>
                        </div>
                      </div>
                      <div>
                        {hasExistingLink(product.id) ? (
                          <Badge variant="secondary">Link Created</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => createAffiliateLink(product.id)}
                            disabled={creatingLink === product.id}
                          >
                            {creatingLink === product.id ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                              <>
                                <Link2 className="w-4 h-4 mr-2" />
                                Get Link
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default AffiliateDashboard;
