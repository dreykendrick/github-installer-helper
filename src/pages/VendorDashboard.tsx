import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Package, Plus, TrendingUp, DollarSign, Eye, Clock, LogOut } from 'lucide-react';
import { AddProductModal } from '@/components/dashboard/AddProductModal';
import { formatCurrency } from '@/utils/currency';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  category: string;
  status: string;
  image_url: string;
  sales: number;
  created_at: string;
}

interface VendorStats {
  totalProducts: number;
  approvedProducts: number;
  pendingProducts: number;
  totalSales: number;
  totalRevenue: number;
}

const VendorDashboard = () => {
  const { user, loading, isVendor, signOut } = useAuth();
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<VendorStats>({
    totalProducts: 0,
    approvedProducts: 0,
    pendingProducts: 0,
    totalSales: 0,
    totalRevenue: 0,
  });
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
      } else if (!isVendor) {
        navigate('/dashboard');
      }
    }
  }, [user, loading, isVendor, navigate]);

  useEffect(() => {
    if (user && isVendor) {
      fetchProducts();
    }
  }, [user, isVendor]);

  const fetchProducts = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('vendor_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
    } else {
      const productList = data || [];
      setProducts(productList);
      
      // Calculate stats
      const approved = productList.filter(p => p.status === 'approved');
      const pending = productList.filter(p => p.status === 'pending');
      const totalSales = productList.reduce((sum, p) => sum + (p.sales || 0), 0);
      const totalRevenue = productList.reduce((sum, p) => sum + ((p.sales || 0) * p.price), 0);
      
      setStats({
        totalProducts: productList.length,
        approvedProducts: approved.length,
        pendingProducts: pending.length,
        totalSales,
        totalRevenue,
      });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">Pending</Badge>;
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
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
            <h1 className="text-2xl font-bold text-foreground">Vendor Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage your products</p>
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={() => setShowAddModal(true)} className="bg-gradient-primary">
              <Plus className="w-4 h-4 mr-2" />
              Add Product
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
                  <Package className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalProducts}</p>
                  <p className="text-xs text-muted-foreground">Total Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Eye className="w-5 h-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.approvedProducts}</p>
                  <p className="text-xs text-muted-foreground">Live Products</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Clock className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.pendingProducts}</p>
                  <p className="text-xs text-muted-foreground">Pending Review</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSales}</p>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Products List */}
        <Card className="bg-card border-border">
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">Your Products</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {products.length === 0 ? (
              <div className="p-8 text-center">
                <Package className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No products yet</h3>
                <p className="text-muted-foreground mb-4">Start by adding your first product</p>
                <Button onClick={() => setShowAddModal(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Product
                </Button>
              </div>
            ) : (
              <div className="divide-y divide-border">
                {products.map((product) => (
                  <div key={product.id} className="p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors">
                    <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center overflow-hidden flex-shrink-0">
                      {product.image_url ? (
                        <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-6 h-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground truncate">{product.title}</h4>
                      <p className="text-sm text-muted-foreground truncate">{product.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-foreground">{formatCurrency(product.price / 100)}</p>
                      <p className="text-xs text-muted-foreground">{product.sales || 0} sales</p>
                    </div>
                    <div>
                      {getStatusBadge(product.status)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <AddProductModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onProductAdded={fetchProducts}
      />
    </div>
  );
};

export default VendorDashboard;
