import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  userRole: 'vendor' | 'affiliate' | 'admin' | null;
  isAdmin: boolean;
  isVendor: boolean;
  isAffiliate: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'vendor' | 'affiliate' | 'admin' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [isAffiliate, setIsAffiliate] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Defer role fetching with setTimeout to prevent deadlock
        if (session?.user) {
          setTimeout(() => {
            fetchUserRoles(session.user.id);
          }, 0);
        } else {
          resetRoles();
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        fetchUserRoles(session.user.id);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const resetRoles = () => {
    setUserRole(null);
    setIsAdmin(false);
    setIsVendor(false);
    setIsAffiliate(false);
  };

  const fetchUserRoles = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (error) {
        console.error('Error fetching user roles:', error);
        return;
      }

      const roles = data?.map(r => r.role) || [];
      setIsAdmin(roles.includes('admin'));
      setIsVendor(roles.includes('vendor'));
      setIsAffiliate(roles.includes('affiliate'));
      
      // Set primary role for backward compatibility
      if (roles.includes('admin')) {
        setUserRole('admin');
      } else if (roles.includes('vendor')) {
        setUserRole('vendor');
      } else if (roles.includes('affiliate')) {
        setUserRole('affiliate');
      } else {
        setUserRole(null);
      }
    } catch (error) {
      console.error('Error fetching user roles:', error);
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    resetRoles();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, userRole, isAdmin, isVendor, isAffiliate, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};