import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';

const Dashboard = () => {
  const { user, loading, isAdmin, isVendor, isAffiliate, userRole } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        navigate('/login');
        return;
      }
      
      // Redirect to role-specific dashboard
      if (isVendor) {
        navigate('/vendor', { replace: true });
      } else if (isAffiliate) {
        navigate('/affiliate', { replace: true });
      } else if (isAdmin) {
        navigate('/admin', { replace: true });
      }
      // If no role, stay on this page and show role application options
    }
  }, [user, loading, isAdmin, isVendor, isAffiliate, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user has no role, show options to apply
  if (!userRole) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6">
          <h1 className="text-3xl font-bold text-foreground">Welcome!</h1>
          <p className="text-muted-foreground">
            To get started, apply for a vendor or affiliate role.
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => navigate('/applications')}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Apply for Access
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading redirect
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
};

export default Dashboard;