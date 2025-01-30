import { useEffect, useState } from "react";
import Navigation from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

interface Profile {
  first_name: string;
  last_name: string;
  phone_number: string;
}

const Profile = () => {
  const { session } = useAuth();
  const [profile, setProfile] = useState<Profile>({
    first_name: "",
    last_name: "",
    phone_number: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    const getProfile = async () => {
      if (!session?.user.id) return;
      
      try {
        setIsLoadingProfile(true);
        const { data, error } = await supabase
          .from("profiles")
          .select("first_name, last_name, phone_number")
          .eq("id", session.user.id)
          .maybeSingle();

        if (error) {
          toast({
            variant: "destructive",
            title: "Error",
            description: "Failed to load profile",
          });
          return;
        }

        if (data) {
          setProfile(data);
        } else {
          toast({
            variant: "destructive",
            title: "Profile Not Found",
            description: "Your profile information could not be found",
          });
        }
      } catch (error) {
        toast({
          variant: "destructive",
          title: "Error",
          description: "An unexpected error occurred",
        });
      } finally {
        setIsLoadingProfile(false);
      }
    };

    getProfile();
  }, [session?.user.id, toast]);

  const handleUpdateProfile = async () => {
    if (!session?.user.id) return;
    
    setIsLoading(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        phone_number: profile.phone_number,
      })
      .eq("id", session.user.id);

    setIsLoading(false);

    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to update profile",
      });
      return;
    }

    toast({
      title: "Success",
      description: "Profile updated successfully",
    });
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to sign out",
      });
      return;
    }
    navigate("/auth");
  };

  if (isLoadingProfile) {
    return (
      <div className="min-h-screen pb-20">
        <div className="p-4">
          <h1 className="text-2xl font-bold text-primary mb-4">Profile</h1>
          <div className="flex justify-center items-center h-48">
            <p>Loading profile...</p>
          </div>
        </div>
        <Navigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20">
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-2xl font-bold text-primary">Profile</h1>
          <Button 
            variant="outline" 
            onClick={handleLogout}
            className="bg-red-500 text-white hover:bg-red-600"
          >
            Logout
          </Button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <Input 
              value={session?.user.email || ""}
              disabled
              className="bg-gray-100"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              First Name
            </label>
            <Input 
              value={profile.first_name}
              disabled
              className="bg-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Name
            </label>
            <Input 
              value={profile.last_name}
              disabled
              className="bg-gray-100"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <Input 
              value={profile.phone_number}
              onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
              placeholder="Enter phone number"
            />
          </div>
          
          <Button 
            className="w-full" 
            onClick={handleUpdateProfile}
            disabled={isLoading}
          >
            {isLoading ? "Updating..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <Navigation />
    </div>
  );
};

export default Profile;