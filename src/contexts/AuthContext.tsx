
import { createContext, useContext, useEffect, useState } from "react";
import { Session, AuthChangeEvent } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
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
  const { toast } = useToast();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) {
        console.error("Error getting session:", error);
        setSession(null);
        navigate("/auth", { state: { returnTo: window.location.pathname } });
        return;
      }
      setSession(session);
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, session) => {
      console.log('Auth state changed:', event);
      
      if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully');
        setSession(session);
      } else if (event === 'SIGNED_OUT' || event === 'INITIAL_SESSION') {
        console.log('Session ended:', event);
        setSession(null);
        
        // Save current path for redirect after login
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth') {
          navigate("/auth", { state: { returnTo: currentPath } });
          
          if (event === 'SIGNED_OUT') {
            toast({
              title: "Signed out",
              description: "You have been signed out successfully",
            });
          }
        }
      }

      setIsLoading(false);
    });

    // Handle refresh token errors
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (
        error?.message?.includes('refresh_token_not_found') ||
        error?.message?.includes('Invalid Refresh Token')
      ) {
        console.error('Refresh token error detected:', error);
        setSession(null);
        const currentPath = window.location.pathname;
        if (currentPath !== '/auth') {
          navigate("/auth", { state: { returnTo: currentPath } });
          toast({
            title: "Session expired",
            description: "Please sign in again",
            variant: "destructive",
          });
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, toast]);

  return (
    <AuthContext.Provider value={{ session, isLoading }}>
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
