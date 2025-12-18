import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CheckCircle, XCircle, Phone, Mail, Image, Eye } from 'lucide-react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  phone_verified: boolean;
  email_verified: boolean;
  image_verified: boolean;
  verification_image_url: string;
  wallet_balance: number;
  created_at: string;
}

interface UserRole {
  user_id: string;
  role: string;
}

const Users = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchUsers();
    }
  }, [user]);

  const fetchUsers = async () => {
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, email, phone, phone_verified, email_verified, image_verified, verification_image_url, wallet_balance, created_at')
      .order('created_at', { ascending: false });

    if (profilesError) {
      console.error('Error fetching profiles:', profilesError);
      return;
    }

    setProfiles(profilesData || []);

    const { data: rolesData } = await supabase
      .from('user_roles')
      .select('user_id, role');

    const rolesMap: Record<string, string[]> = {};
    rolesData?.forEach((r: UserRole) => {
      if (!rolesMap[r.user_id]) {
        rolesMap[r.user_id] = [];
      }
      rolesMap[r.user_id].push(r.role);
    });
    setRoles(rolesMap);
  };

  const toggleVerification = async (profileId: string, field: 'phone_verified' | 'email_verified' | 'image_verified', currentValue: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: !currentValue })
      .eq('id', profileId);

    if (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification status');
      return;
    }

    toast.success(`${field.replace('_verified', '').charAt(0).toUpperCase() + field.replace('_verified', '').slice(1)} verification updated`);
    fetchUsers();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const VerificationButton = ({ 
    verified, 
    onClick, 
    icon: Icon, 
    label 
  }: { 
    verified: boolean; 
    onClick: () => void; 
    icon: React.ElementType; 
    label: string;
  }) => (
    <Button
      variant={verified ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={`gap-1 ${verified ? 'bg-green-600 hover:bg-green-700' : ''}`}
      title={`${verified ? 'Verified' : 'Not verified'} - Click to toggle`}
    >
      <Icon className="w-3 h-3" />
      {verified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    </Button>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">Manage platform users and verification status</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Roles</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Verification</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">ID Image</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Wallet</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Joined</th>
                </tr>
              </thead>
              <tbody>
                {profiles.map((profile) => (
                  <tr key={profile.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{profile.full_name || 'No name'}</p>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                      </div>
                    </td>
                    <td className="p-4 text-muted-foreground">{profile.phone || '-'}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1">
                        {roles[profile.id]?.map((role) => (
                          <Badge key={role} variant="outline" className="capitalize">
                            {role}
                          </Badge>
                        )) || <span className="text-muted-foreground">-</span>}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex gap-1">
                        <VerificationButton
                          verified={profile.phone_verified || false}
                          onClick={() => toggleVerification(profile.id, 'phone_verified', profile.phone_verified || false)}
                          icon={Phone}
                          label="Phone"
                        />
                        <VerificationButton
                          verified={profile.email_verified || false}
                          onClick={() => toggleVerification(profile.id, 'email_verified', profile.email_verified || false)}
                          icon={Mail}
                          label="Email"
                        />
                        <VerificationButton
                          verified={profile.image_verified || false}
                          onClick={() => toggleVerification(profile.id, 'image_verified', profile.image_verified || false)}
                          icon={Image}
                          label="Image"
                        />
                      </div>
                    </td>
                    <td className="p-4">
                      {profile.verification_image_url ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedImage(profile.verification_image_url)}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">Not uploaded</span>
                      )}
                    </td>
                    <td className="p-4 text-foreground font-medium">
                      {formatCurrency(profile.wallet_balance || 0)}
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(profile.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {profiles.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Verification Image</DialogTitle>
          </DialogHeader>
          {selectedImage && (
            <img 
              src={selectedImage} 
              alt="Verification document" 
              className="w-full rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Users;
