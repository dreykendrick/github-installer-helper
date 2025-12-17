import { useState } from 'react';
import { DollarSign, ShoppingCart, Package, Eye, Plus } from 'lucide-react';
import { User, Product, VendorStats } from '@/types';
import { formatCurrency } from '@/utils/currency';
import { StatsCard } from './StatsCard';
import { WalletCard } from './WalletCard';
import { VerificationStatusCard } from './VerificationStatusCard';
import { AddProductModal } from './AddProductModal';

interface VendorDashboardProps {
  currentUser: User;
  products: Product[];
  stats: VendorStats;
  onVerify: () => void;
  onProductAdded?: () => void;
}

export const VendorDashboard = ({ currentUser, products, stats, onVerify, onProductAdded }: VendorDashboardProps) => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const handleProductAdded = () => {
    onProductAdded?.();
  };

  return (
    <>
      <div className="mb-6 sm:mb-8 animate-in fade-in slide-in-from-top-3 duration-500">
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">Welcome back, {currentUser.name}!</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Here's your vendor dashboard overview</p>
      </div>

      <div className="mb-6 sm:mb-8">
        <VerificationStatusCard onVerify={onVerify} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6 mb-6 sm:mb-8">
        <StatsCard icon={DollarSign} value={formatCurrency(stats.revenue)} label="Total Revenue" gradient="from-afrilink-green to-emerald-600" />
        <StatsCard icon={ShoppingCart} value={stats.sales} label="Total Sales" gradient="from-afrilink-blue to-cyan-600" />
        <StatsCard icon={Package} value={stats.products} label="Active Products" gradient="from-afrilink-purple to-afrilink-pink" />
        <StatsCard icon={Eye} value={stats.pending} label="Pending Review" gradient="from-afrilink-amber to-afrilink-orange" />
      </div>

      <div className="bg-card rounded-xl sm:rounded-2xl border border-border overflow-hidden shadow-card mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-200">
        <div className="p-4 sm:p-6 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h2 className="text-lg sm:text-xl font-bold text-foreground">Your Products</h2>
          <button 
            onClick={() => setIsAddModalOpen(true)}
            className="w-full sm:w-auto px-4 py-2 bg-gradient-primary text-white rounded-lg font-semibold flex items-center justify-center space-x-2 hover:shadow-glow transition-all duration-300"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
        <div className="p-4 sm:p-6 space-y-3 sm:space-y-4">
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No products yet. Add your first product!</p>
            </div>
          ) : (
            products.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center justify-between p-3 sm:p-4 bg-secondary/50 rounded-lg sm:rounded-xl hover:bg-secondary transition-all duration-200 animate-in fade-in slide-in-from-left-3 duration-500"
                style={{ animationDelay: `${300 + index * 50}ms` }}
              >
                <div className="flex items-center space-x-3 sm:space-x-4">
                  <img src={product.image} alt={product.title} className="w-12 h-12 sm:w-16 sm:h-16 rounded-lg object-cover" />
                  <div>
                    <div className="font-semibold text-foreground text-sm sm:text-base">{product.title}</div>
                    <div className="text-xs sm:text-sm text-muted-foreground">{product.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-foreground text-sm sm:text-base">{formatCurrency(product.price)}</div>
                  <div className="text-xs sm:text-sm text-muted-foreground">{product.sales} sales</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <WalletCard balance={currentUser.wallet} />

      <AddProductModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onProductAdded={handleProductAdded}
      />
    </>
  );
};