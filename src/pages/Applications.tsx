import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Check, X } from 'lucide-react';

interface Application {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  role: string;
  business_name: string;
  reason: string;
  status: string;
  created_at: string;
}

const Applications = () => {
  const { user, loading, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<Application[]>([]);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

  useEffect(() => {
    if (!loading) {
      if (!user || !isAdmin) {
        navigate('/login');
      }
    }
  }, [user, loading, isAdmin, navigate]);

  useEffect(() => {
    if (user) {
      fetchApplications();
    }
  }, [user, filter]);

  const fetchApplications = async () => {
    let query = supabase.from('applications').select('*').order('created_at', { ascending: false });
    
    if (filter !== 'all') {
      query = query.eq('status', filter);
    }

    const { data, error } = await query;
    if (error) {
      console.error('Error fetching applications:', error);
    } else {
      setApplications(data || []);
    }
  };

  const handleApplication = async (application: Application, approved: boolean) => {
    const status = approved ? 'approved' : 'rejected';

    const { error } = await supabase
      .from('applications')
      .update({ status })
      .eq('id', application.id);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to update application',
        variant: 'destructive',
      });
      return;
    }

    if (approved) {
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: application.user_id,
          role: application.role as 'affiliate' | 'vendor',
        }]);

      if (roleError && !roleError.message.includes('duplicate')) {
        console.error('Error adding role:', roleError);
      }
    }

    toast({
      title: 'Success',
      description: `Application ${status}`,
    });
    fetchApplications();
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500">Approved</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Applications</h1>
            <p className="text-muted-foreground">Review vendor and affiliate applications</p>
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilter(f)}
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </Button>
            ))}
          </div>
        </div>

        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-4 font-medium text-muted-foreground">Applicant</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Role</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Business</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Status</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Date</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {applications.map((application) => (
                  <tr key={application.id} className="border-t border-border hover:bg-muted/30">
                    <td className="p-4">
                      <div>
                        <p className="font-medium text-foreground">{application.full_name}</p>
                        <p className="text-sm text-muted-foreground">{application.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className="capitalize">{application.role}</Badge>
                    </td>
                    <td className="p-4">
                      <div>
                        <p className="text-foreground">{application.business_name || '-'}</p>
                        <p className="text-sm text-muted-foreground line-clamp-1">{application.reason}</p>
                      </div>
                    </td>
                    <td className="p-4">{getStatusBadge(application.status)}</td>
                    <td className="p-4 text-muted-foreground">
                      {new Date(application.created_at).toLocaleDateString()}
                    </td>
                    <td className="p-4">
                      {application.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-green-600 hover:text-green-700"
                            onClick={() => handleApplication(application, true)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                            onClick={() => handleApplication(application, false)}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {applications.length === 0 && (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                      No applications found
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

export default Applications;