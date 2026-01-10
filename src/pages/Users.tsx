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
  DialogFooter,
  DialogDescription,
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

interface VerificationDialog {
  type: 'phone' | 'email' | 'image' | null;
  profile: Profile | null;
}

const Users = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [roles, setRoles] = useState<Record<string, string[]>>({});
  const [verificationDialog, setVerificationDialog] = useState<VerificationDialog>({ type: null, profile: null });

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        navigate('/login');
      }
    }
  }, [user, loading, isAdmin, navigate]);

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

  const handleVerificationClick = (profile: Profile, type: 'phone' | 'email' | 'image') => {
    setVerificationDialog({ type, profile });
  };

  const toggleVerification = async (approve: boolean) => {
    if (!verificationDialog.profile || !verificationDialog.type) return;

    const field = `${verificationDialog.type}_verified` as 'phone_verified' | 'email_verified' | 'image_verified';
    const currentValue = verificationDialog.profile[field] || false;
    const newValue = approve ? true : false;

    // If already in the desired state, just close
    if (currentValue === newValue) {
      setVerificationDialog({ type: null, profile: null });
      return;
    }

    // Build update object - for image verification, also update verification_status
    const updateData: Record<string, any> = { [field]: newValue };
    
    if (verificationDialog.type === 'image') {
      updateData.verification_status = approve ? 'approved' : 'rejected';
    }

    const { error } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', verificationDialog.profile.id);

    if (error) {
      console.error('Error updating verification:', error);
      toast.error('Failed to update verification status');
      return;
    }

    toast.success(`${verificationDialog.type.charAt(0).toUpperCase() + verificationDialog.type.slice(1)} ${approve ? 'verified' : 'unverified'}`);
    setVerificationDialog({ type: null, profile: null });
    fetchUsers();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const VerificationBadge = ({ 
    verified, 
    onClick, 
    icon: Icon, 
  }: { 
    verified: boolean; 
    onClick: () => void; 
    icon: React.ElementType; 
  }) => (
    <Button
      variant={verified ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      className={`gap-1 ${verified ? 'bg-green-600 hover:bg-green-700' : ''}`}
      title={`${verified ? 'Verified' : 'Not verified'} - Click to review`}
    >
      <Icon className="w-3 h-3" />
      {verified ? <CheckCircle className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
    </Button>
  );

  const getDialogContent = () => {
    if (!verificationDialog.profile || !verificationDialog.type) return null;
    const profile = verificationDialog.profile;
    const isVerified = profile[`${verificationDialog.type}_verified` as keyof Profile] || false;

    switch (verificationDialog.type) {
      case 'phone':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Phone Verification</DialogTitle>
              <DialogDescription>
                Review the phone number before {isVerified ? 'revoking' : 'approving'} verification
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{profile.full_name || 'No name'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone Number</p>
                  <p className="font-medium text-lg">{profile.phone || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={isVerified ? "default" : "secondary"}>
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        );
      case 'email':
        return (
          <>
            <DialogHeader>
              <DialogTitle>Email Verification</DialogTitle>
              <DialogDescription>
                Review the email before {isVerified ? 'revoking' : 'approving'} verification
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{profile.full_name || 'No name'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email Address</p>
                  <p className="font-medium text-lg">{profile.email || 'Not provided'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={isVerified ? "default" : "secondary"}>
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
              </div>
            </div>
          </>
        );
      case 'image':
        return (
          <>
            <DialogHeader>
              <DialogTitle>ID Image Verification</DialogTitle>
              <DialogDescription>
                Review the uploaded ID document before {isVerified ? 'revoking' : 'approving'} verification
              </DialogDescription>
            </DialogHeader>
            <div className="py-6">
              <div className="bg-muted rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">User</p>
                  <p className="font-medium">{profile.full_name || 'No name'}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Status</p>
                  <Badge variant={isVerified ? "default" : "secondary"}>
                    {isVerified ? 'Verified' : 'Not Verified'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-2">ID Document</p>
                  {profile.verification_image_url ? (
                    <img 
                      src={profile.verification_image_url} 
                      alt="Verification document" 
                      className="w-full max-h-64 object-contain rounded-lg border"
                    />
                  ) : (
                    <div className="bg-background border border-dashed rounded-lg p-8 text-center text-muted-foreground">
                      No image uploaded
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const isCurrentlyVerified = verificationDialog.profile && verificationDialog.type
    ? verificationDialog.profile[`${verificationDialog.type}_verified` as keyof Profile] || false
    : false;

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
                        <VerificationBadge
                          verified={profile.phone_verified || false}
                          onClick={() => handleVerificationClick(profile, 'phone')}
                          icon={Phone}
                        />
                        <VerificationBadge
                          verified={profile.email_verified || false}
                          onClick={() => handleVerificationClick(profile, 'email')}
                          icon={Mail}
                        />
                        <VerificationBadge
                          verified={profile.image_verified || false}
                          onClick={() => handleVerificationClick(profile, 'image')}
                          icon={Image}
                        />
                      </div>
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
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Dialog open={!!verificationDialog.type} onOpenChange={() => setVerificationDialog({ type: null, profile: null })}>
        <DialogContent className="max-w-md">
          {getDialogContent()}
          <DialogFooter className="gap-2 sm:gap-0">
            {isCurrentlyVerified ? (
              <>
                <Button variant="outline" onClick={() => setVerificationDialog({ type: null, profile: null })}>
                  Cancel
                </Button>
                <Button variant="destructive" onClick={() => toggleVerification(false)}>
                  Revoke Verification
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setVerificationDialog({ type: null, profile: null })}>
                  Cancel
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={() => toggleVerification(true)}>
                  Approve Verification
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
};

export default Users;
