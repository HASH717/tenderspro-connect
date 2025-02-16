
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
    supabase.auth.getSession().then(({ data: { session: initialSession }, error }) => {
      if (error) {
        console.error("Error getting initial session:", error);
        setSession(null);
        navigate("/auth");
      } else {
        setSession(initialSession);
      }
      setIsLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event: AuthChangeEvent, currentSession) => {
      console.log('Auth state changed:', event, 'Session:', currentSession ? 'exists' : 'null');
      
      if (event === 'SIGNED_OUT' || event === 'USER_DELETED') {
        setSession(null);
        navigate("/auth");
        toast({
          title: "Signed out",
          description: "You have been signed out successfully",
        });
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        setSession(currentSession);
        if (window.location.pathname === '/auth') {
          navigate("/");
        }
      } else if (event === 'INITIAL_SESSION') {
        // If no session on initial load, redirect to auth
        if (!currentSession) {
          setSession(null);
          if (window.location.pathname !== '/auth') {
            navigate("/auth");
          }
        } else {
          setSession(currentSession);
          if (window.location.pathname === '/auth') {
            navigate("/");
          }
        }
      }

      setIsLoading(false);
    });

    // Cleanup subscription on unmount
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
