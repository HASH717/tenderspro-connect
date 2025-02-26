
import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useLocation } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

type AuthContextType = {
  session: Session | null;
  isLoading: boolean;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      console.log('Initial session check:', session ? 'Session exists' : 'No session');
      
      if (error) {
        console.error("Error getting session:", error);
        toast({
          variant: "destructive",
          title: "Authentication Error",
          description: "Please sign in again",
        });
        navigate("/auth");
        return;
      }

      // If we have a session but we're on the auth page, redirect to the intended destination
      if (session && location.pathname === '/auth') {
        const returnTo = location.state?.returnTo || '/';
        console.log('Redirecting from auth to:', returnTo);
        navigate(returnTo, { replace: true });
      }

      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log('Auth state change:', _event, session ? 'Session exists' : 'No session');
      
      if (_event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
      }
      
      if (_event === 'SIGNED_OUT') {
        navigate("/auth");
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      }

      // If session exists and we're on auth page, redirect to the intended destination
      if (session && location.pathname === '/auth') {
        const returnTo = location.state?.returnTo || '/';
        console.log('Redirecting after auth state change to:', returnTo);
        navigate(returnTo, { replace: true });
      }

      setSession(session);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate, toast, location]);

  const contextValue = {
    session,
    isLoading,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
