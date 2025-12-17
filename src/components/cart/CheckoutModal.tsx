import { useState } from 'react';
import { X, CreditCard, Loader2 } from 'lucide-react';
import { useCart } from '@/hooks/useCart';
import { formatCurrency } from '@/utils/currency';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CheckoutModal = ({ isOpen, onClose, onSuccess }: CheckoutModalProps) => {
  const { items, totalPrice, affiliateCode, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: ''
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      // Get affiliate link ID if code exists
      let affiliateLinkId = null;
      if (affiliateCode) {
        const { data: linkData } = await supabase
          .from('affiliate_links')
          .select('id')
          .eq('code', affiliateCode)
          .maybeSingle();
        
        if (linkData) {
          affiliateLinkId = linkData.id;
        }
      }

      // Create order
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_name: form.name,
          customer_email: form.email,
          total_amount: totalPrice,
          status: 'completed',
          affiliate_link_id: affiliateLinkId
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItems = items.map(item => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        price: item.price,
        commission_amount: Math.round((item.price * item.commission) / 100)
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItems);

      if (itemsError) throw itemsError;

      // Update affiliate link conversions if applicable
      if (affiliateLinkId) {
        const totalCommission = orderItems.reduce((sum, item) => sum + item.commission_amount * item.quantity, 0);
        
        // Get current link data
        const { data: currentLink } = await supabase
          .from('affiliate_links')
          .select('conversions, commission_earned, affiliate_id')
          .eq('id', affiliateLinkId)
          .single();

        if (currentLink) {
          // Update link stats
          await supabase
            .from('affiliate_links')
            .update({
              conversions: (currentLink.conversions || 0) + 1,
              commission_earned: (currentLink.commission_earned || 0) + totalCommission
            })
            .eq('id', affiliateLinkId);

          // Get current wallet balance and update
          const { data: profile } = await supabase
            .from('profiles')
            .select('wallet_balance')
            .eq('id', currentLink.affiliate_id)
            .single();

          if (profile) {
            await supabase
              .from('profiles')
              .update({
                wallet_balance: (profile.wallet_balance || 0) + totalCommission
              })
              .eq('id', currentLink.affiliate_id);
          }

          // Record transaction
          await supabase
            .from('transactions')
            .insert({
              user_id: currentLink.affiliate_id,
              type: 'commission',
              amount: totalCommission,
              description: `Commission from order #${order.id.slice(0, 8)}`,
              reference_id: order.id
            });
        }
      }

      // Credit vendor wallets
      for (const item of items) {
        const vendorAmount = item.price * item.quantity - Math.round((item.price * item.commission * item.quantity) / 100);
        
        // Record vendor transaction
        await supabase
          .from('transactions')
          .insert({
            user_id: item.vendorId,
            type: 'sale',
            amount: vendorAmount,
            description: `Sale of ${item.title} x${item.quantity}`,
            reference_id: order.id
          });
      }

      clearCart();
      toast.success('Order placed successfully!');
      onSuccess();
    } catch (error: any) {
      console.error('Checkout error:', error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-card rounded-2xl max-w-lg w-full p-6 border border-border shadow-card animate-in zoom-in-95 duration-300 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-bold text-foreground">Checkout</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-secondary rounded-lg transition-colors">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-secondary/50 rounded-xl border border-border">
          <h3 className="font-semibold text-foreground mb-3">Order Summary</h3>
          <div className="space-y-2">
            {items.map(item => (
              <div key={item.id} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{item.title} x{item.quantity}</span>
                <span className="text-foreground">{formatCurrency(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-border mt-3 pt-3 flex justify-between">
            <span className="font-semibold text-foreground">Total</span>
            <span className="font-bold text-primary text-lg">{formatCurrency(totalPrice)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Full Name *</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="Enter your name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Email *</label>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="Enter your email"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Phone (Optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full px-4 py-3 bg-secondary border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary text-foreground"
              placeholder="Enter your phone number"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-gradient-primary text-white rounded-xl font-bold hover:shadow-glow transition-all duration-300 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Processing...
              </>
            ) : (
              `Pay ${formatCurrency(totalPrice)}`
            )}
          </button>
        </form>
      </div>
    </div>
  );
};
