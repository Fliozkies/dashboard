import Sidebar from "../components/Sidebar";
import { AuthProvider } from "../components/AuthProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <div className="flex min-h-screen bg-[#070b14]">
        <Sidebar />
        <main className="flex-1 ml-[220px] overflow-auto">{children}</main>
      </div>
    </AuthProvider>
  );
}
