
import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LoginForm } from "@/components/auth/LoginForm";
import { SignupForm } from "@/components/auth/SignupForm";

const Auth = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/';
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    console.log('Auth page - Session state:', !!session);
    console.log('Auth page - Return path:', returnTo);

    if (session) {
      // Ensure we're using the complete return path
      const fullReturnPath = returnTo.includes('?') 
        ? returnTo 
        : location.state?.returnTo || '/';
      
      console.log('Auth page - Redirecting to:', fullReturnPath);
      
      // Use replace to prevent back button issues
      navigate(fullReturnPath, { replace: true });
    }
  }, [session, navigate, returnTo, location.state]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md p-6">
        <div className="flex flex-col items-center mb-6">
          <img 
            src="/lovable-uploads/dd1ac162-5e48-4a48-9eb6-9a93ca0170f1.png" 
            alt="TendersPRO Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>
        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Sign Up</TabsTrigger>
          </TabsList>
          
          <TabsContent value="login">
            <LoginForm isLoading={isLoading} setIsLoading={setIsLoading} />
          </TabsContent>

          <TabsContent value="signup">
            <SignupForm isLoading={isLoading} setIsLoading={setIsLoading} />
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
