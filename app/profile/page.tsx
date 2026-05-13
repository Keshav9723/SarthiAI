// app/profile/page.tsx — auth-gated profile.

import ProfileView from "@/components/profile/ProfileView";

export const metadata = {
  title: "Profile",
};

export default function ProfilePage() {
  return <ProfileView />;
}
