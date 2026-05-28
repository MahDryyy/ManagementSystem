import AppShell from "@/components/AppShell";
import { AuthProvider } from "@/contexts/AuthContext";

export default function Home() {
  return (
    <div className="h-full">
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </div>
  );
}
