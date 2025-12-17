import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings as SettingsIcon, Shield, Bell, Wallet, Store } from 'lucide-react';

const Settings = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [settings, setSettings] = useState({
    platformName: 'AfriLink',
    supportEmail: 'support@afrilink.com',
    commissionRate: 10,
    minWithdrawal: 5000,
    autoApproveProducts: false,
    autoApproveVendors: false,
    emailNotifications: true,
    maintenanceMode: false,
  });

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  const handleSave = () => {
    toast({
      title: 'Settings saved',
      description: 'Platform settings have been updated.',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Configure platform settings</p>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
              <SettingsIcon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">General Settings</h2>
              <p className="text-sm text-muted-foreground">Basic platform configuration</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="platformName">Platform Name</Label>
              <Input
                id="platformName"
                value={settings.platformName}
                onChange={(e) => setSettings({ ...settings, platformName: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="supportEmail">Support Email</Label>
              <Input
                id="supportEmail"
                type="email"
                value={settings.supportEmail}
                onChange={(e) => setSettings({ ...settings, supportEmail: e.target.value })}
                className="bg-secondary/50"
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-amber rounded-lg flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Commission & Payments</h2>
              <p className="text-sm text-muted-foreground">Configure payment settings</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="commissionRate">Platform Commission Rate (%)</Label>
              <Input
                id="commissionRate"
                type="number"
                min="0"
                max="100"
                value={settings.commissionRate}
                onChange={(e) => setSettings({ ...settings, commissionRate: parseInt(e.target.value) })}
                className="bg-secondary/50"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="minWithdrawal">Minimum Withdrawal (NGN)</Label>
              <Input
                id="minWithdrawal"
                type="number"
                min="0"
                value={settings.minWithdrawal}
                onChange={(e) => setSettings({ ...settings, minWithdrawal: parseInt(e.target.value) })}
                className="bg-secondary/50"
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-purple rounded-lg flex items-center justify-center">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Approval Settings</h2>
              <p className="text-sm text-muted-foreground">Configure auto-approval rules</p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Auto-approve Products</p>
                <p className="text-sm text-muted-foreground">Automatically approve new product listings</p>
              </div>
              <Switch
                checked={settings.autoApproveProducts}
                onCheckedChange={(checked) => setSettings({ ...settings, autoApproveProducts: checked })}
              />
            </div>
            <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
              <div>
                <p className="font-medium text-foreground">Auto-approve Vendors</p>
                <p className="text-sm text-muted-foreground">Automatically approve vendor applications</p>
              </div>
              <Switch
                checked={settings.autoApproveVendors}
                onCheckedChange={(checked) => setSettings({ ...settings, autoApproveVendors: checked })}
              />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-gradient-blue rounded-lg flex items-center justify-center">
              <Bell className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Notifications</h2>
              <p className="text-sm text-muted-foreground">Configure notification settings</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-secondary/30 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Email Notifications</p>
              <p className="text-sm text-muted-foreground">Receive email alerts for important events</p>
            </div>
            <Switch
              checked={settings.emailNotifications}
              onCheckedChange={(checked) => setSettings({ ...settings, emailNotifications: checked })}
            />
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-destructive/10 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-destructive" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">System</h2>
              <p className="text-sm text-muted-foreground">Critical system settings</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-destructive/5 border border-destructive/20 rounded-lg">
            <div>
              <p className="font-medium text-foreground">Maintenance Mode</p>
              <p className="text-sm text-muted-foreground">Temporarily disable the platform for maintenance</p>
            </div>
            <Switch
              checked={settings.maintenanceMode}
              onCheckedChange={(checked) => setSettings({ ...settings, maintenanceMode: checked })}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} className="bg-gradient-primary hover:opacity-90">
            Save Changes
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default Settings;