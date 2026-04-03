import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <Sidebar />
      <main
        style={{
          marginLeft: 260,
          flex: 1,
          padding: "2rem",
          minHeight: "100vh",
          backgroundColor: "var(--color-bg-primary)",
        }}
      >
        <Header />
        {children}
      </main>
    </div>
  );
}
