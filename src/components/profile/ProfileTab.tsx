import { ProfileForm } from "@/components/profile/ProfileForm";

interface ProfileTabProps {
  email: string;
  profile: {
    first_name: string;
    last_name: string;
    phone_number: string;
  };
  setEmail: (email: string) => void;
  setProfile: (profile: any) => void;
  userId: string;
}

export const ProfileTab = ({ email, profile, setEmail, setProfile, userId }: ProfileTabProps) => {
  return (
    <div className="space-y-4 bg-white p-6 rounded-lg border">
      <ProfileForm 
        email={email}
        profile={profile}
        setEmail={setEmail}
        setProfile={setProfile}
        userId={userId}
      />
    </div>
  );
};
