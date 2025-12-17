import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle } from 'lucide-react';

interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  verification_status: string;
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
      .select('*')
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
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
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users</h1>
          <p className="text-muted-foreground">Manage platform users</p>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">User</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Phone</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Roles</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Verified</th>
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
                      {profile.verification_status === 'verified' ? (
                        <CheckCircle className="w-5 h-5 text-green-500" />
                      ) : (
                        <XCircle className="w-5 h-5 text-muted-foreground" />
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
    </AdminLayout>
  );
};

export default Users;