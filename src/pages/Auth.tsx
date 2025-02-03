import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Auth = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const location = useLocation();
  const returnTo = location.state?.returnTo || '/';
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (session) {
      navigate(returnTo);
    }
  }, [session, navigate, returnTo]);

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const firstName = formData.get('firstName') as string;
    const lastName = formData.get('lastName') as string;
    const phoneNumber = formData.get('phoneNumber') as string;
    const wilaya = formData.get('wilaya') as string;

    if (!wilaya) {
      toast.error('Wilaya is required');
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            phone_number: phoneNumber,
            wilaya: wilaya,
          },
        },
      });

      if (error) throw error;
      
      toast.success('Check your email to confirm your account');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

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
            <form onSubmit={handleEmailLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input 
                  id="login-email"
                  type="email" 
                  name="email" 
                  placeholder="Enter your email" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input 
                  id="login-password"
                  type="password" 
                  name="password" 
                  placeholder="Enter your password" 
                  required 
                />
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Login"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleEmailSignUp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <Input 
                  id="signup-email"
                  type="email" 
                  name="email" 
                  placeholder="Enter your email" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <Input 
                  id="signup-password"
                  type="password" 
                  name="password" 
                  placeholder="Enter your password" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <Input 
                  id="firstName"
                  type="text" 
                  name="firstName" 
                  placeholder="Enter your first name" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input 
                  id="lastName"
                  type="text" 
                  name="lastName" 
                  placeholder="Enter your last name" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Phone Number</Label>
                <Input 
                  id="phoneNumber"
                  type="text" 
                  name="phoneNumber" 
                  placeholder="Enter your phone number" 
                  required 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="wilaya">Wilaya (Required)</Label>
                <select
                  id="wilaya"
                  name="wilaya"
                  className="w-full p-2 border rounded-md"
                  required
                >
                  <option value="">Select a Wilaya</option>
                  <option value="Adrar">Adrar</option>
                  <option value="Chlef">Chlef</option>
                  <option value="Laghouat">Laghouat</option>
                  <option value="Oum El Bouaghi">Oum El Bouaghi</option>
                  <option value="Batna">Batna</option>
                  <option value="Béjaïa">Béjaïa</option>
                  <option value="Biskra">Biskra</option>
                  <option value="Béchar">Béchar</option>
                  <option value="Blida">Blida</option>
                  <option value="Bouira">Bouira</option>
                  <option value="Tamanrasset">Tamanrasset</option>
                  <option value="Tébessa">Tébessa</option>
                  <option value="Tlemcen">Tlemcen</option>
                  <option value="Tiaret">Tiaret</option>
                  <option value="Tizi Ouzou">Tizi Ouzou</option>
                  <option value="Alger">Alger</option>
                  <option value="Djelfa">Djelfa</option>
                  <option value="Jijel">Jijel</option>
                  <option value="Sétif">Sétif</option>
                  <option value="Saïda">Saïda</option>
                  <option value="Skikda">Skikda</option>
                  <option value="Sidi Bel Abbès">Sidi Bel Abbès</option>
                  <option value="Annaba">Annaba</option>
                  <option value="Guelma">Guelma</option>
                  <option value="Constantine">Constantine</option>
                  <option value="Médéa">Médéa</option>
                  <option value="Mostaganem">Mostaganem</option>
                  <option value="M'Sila">M'Sila</option>
                  <option value="Mascara">Mascara</option>
                  <option value="Ouargla">Ouargla</option>
                  <option value="Oran">Oran</option>
                  <option value="El Bayadh">El Bayadh</option>
                  <option value="Illizi">Illizi</option>
                  <option value="Bordj Bou Arréridj">Bordj Bou Arréridj</option>
                  <option value="Boumerdès">Boumerdès</option>
                  <option value="El Tarf">El Tarf</option>
                  <option value="Tindouf">Tindouf</option>
                  <option value="Tissemsilt">Tissemsilt</option>
                  <option value="El Oued">El Oued</option>
                  <option value="Khenchela">Khenchela</option>
                  <option value="Souk Ahras">Souk Ahras</option>
                  <option value="Tipaza">Tipaza</option>
                  <option value="Mila">Mila</option>
                  <option value="Aïn Defla">Aïn Defla</option>
                  <option value="Naâma">Naâma</option>
                  <option value="Aïn Témouchent">Aïn Témouchent</option>
                  <option value="Ghardaïa">Ghardaïa</option>
                  <option value="Relizane">Relizane</option>
                </select>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Sign Up"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </Card>
    </div>
  );
};

export default Auth;
