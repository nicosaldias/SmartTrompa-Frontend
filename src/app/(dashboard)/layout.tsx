"use client";

import { useState, Component, type ReactNode } from "react";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { Menu } from "lucide-react";
import { useT } from "@/i18n/LanguageProvider";

class ErrorBoundary extends Component<
  { children: ReactNode; messages: { title: string; body: string; reload: string } },
  { hasError: boolean; error?: Error }
> {
  constructor(props: ErrorBoundary["props"]) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      const { title, body, reload } = this.props.messages;
      return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", backgroundColor: "var(--color-bg-primary)", padding: "2rem" }}>
          <div style={{ textAlign: "center", maxWidth: 480 }}>
            <div style={{ fontSize: "3rem", marginBottom: "1rem", opacity: 0.3 }}>&#9888;&#65039;</div>
            <h1 style={{ fontSize: "1.25rem", fontWeight: 700, marginBottom: "0.5rem", color: "var(--color-text-primary)" }}>
              {title}
            </h1>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", marginBottom: "1.5rem" }}>
              {body}
            </p>
            <button onClick={() => window.location.reload()} className="btn-primary" style={{ padding: "0.75rem 2rem" }}>
              {reload}
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const t = useT();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const errorMessages = {
    title: t("common.unexpectedError"),
    body: t("common.errorLoadingSection"),
    reload: t("common.reloadPage"),
  };

  return (
    <div className="dashboard-root">
      {/* Overlay for mobile drawer */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="sidebar-overlay"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        collapsed={collapsed}
        onClose={() => setSidebarOpen(false)}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <main className={`dashboard-main ${collapsed ? "dashboard-main-collapsed" : ""}`}>
        {/* Mobile header bar with hamburger */}
        <div className="mobile-topbar">
          <button
            onClick={() => setSidebarOpen(true)}
            className="hamburger-btn"
            aria-label={t("sidebar.openMenu")}
          >
            <Menu size={24} />
          </button>
          <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{t("branding.appName")}</span>
          <div style={{ width: 40 }} />
        </div>

        <Header />
        <ErrorBoundary messages={errorMessages}>{children}</ErrorBoundary>
      </main>

      <style>{`
        .dashboard-root {
          display: flex;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .dashboard-main {
          margin-left: 260px;
          flex: 1;
          padding: 2rem;
          min-height: 100vh;
          max-width: calc(100vw - 260px);
          background-color: var(--color-bg-primary);
          transition: margin-left 0.25s ease, max-width 0.25s ease;
        }
        .dashboard-main-collapsed {
          margin-left: 72px;
          max-width: calc(100vw - 72px);
        }
        .mobile-topbar {
          display: none;
          align-items: center;
          justify-content: space-between;
          padding: 0.75rem 0;
          margin-bottom: 0.5rem;
        }
        .hamburger-btn {
          background: none;
          border: none;
          color: var(--color-text-primary);
          cursor: pointer;
          padding: 0.5rem;
        }
        .sidebar-overlay {
          display: none;
        }

        /* Mobile + Tablet: <= 1024px */
        @media (max-width: 1024px) {
          .dashboard-main,
          .dashboard-main-collapsed {
            margin-left: 0;
            max-width: 100vw;
            padding: 1rem;
          }
          .mobile-topbar {
            display: flex;
          }
          .sidebar-overlay {
            display: block;
            position: fixed;
            inset: 0;
            background-color: rgba(0,0,0,0.5);
            z-index: 40;
          }
        }
      `}</style>
    </div>
  );
}
