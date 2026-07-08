import React, { useState } from "react";
import { useSelector } from "react-redux";
import ViewSidebar from "./template/view.sidebar.jsx";
import ViewNavbar from "./template/view.navbar.jsx";
import DashboardHome from "./DashboardHome.jsx";
import MembersList from "./MembersList.jsx";
import Treasury from "./Treasury.jsx";
import Secretary from "./Secretary.jsx";
import Donations from "./Donations.jsx";
import HelloAssoCampaigns from "./HelloAssoCampaigns.jsx";
import Tools from "./Tools.jsx";
import Settings from "./Settings.jsx";
import Partners from "./Partners.jsx";
import Events from "./Events.jsx";
// Placeholder for pages not yet implemented
const Placeholder = ({ title }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: 300, animation: "slideUp 0.35s ease" }}>
    <div style={{ fontSize: 48, marginBottom: 16 }}>🚧</div>
    <div style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: 8 }}>{title}</div>
    <div style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Cette section est en cours de développement.</div>
  </div>
);

const PAGE_COMPONENTS = {
  dashboard: <DashboardHome />,
  tools:     <Tools />,
  members:   <MembersList />,
  treasury:  <Treasury />,
  secretary: <Secretary />,
  events:    <Events />,
  donations: <Donations />,
  helloasso: <HelloAssoCampaigns />,
  projects:  <Placeholder title="Gestion des Projets" />,
  partners:  <Partners />,
  settings:  <Settings />,
};

export default function Dashboard() {
  const user = useSelector((s) => s.userReducer.user);
  const [activePage, setActivePage] = useState(() => {
    return localStorage.getItem("monasso_active_page") || "dashboard";
  });
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleSetActivePage = (page) => {
    setActivePage(page);
    localStorage.setItem("monasso_active_page", page);
  };

  if (!user?.email) return null;

  return (
    <div className={`admin-layout ${isCollapsed ? 'layout-collapsed' : ''}`}>
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 99 }} />
      )}
      <ViewSidebar activePage={activePage} setActivePage={handleSetActivePage} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
        <ViewNavbar activePage={activePage} isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <main className="admin-main">
          {PAGE_COMPONENTS[activePage] ?? <DashboardHome />}
        </main>
      </div>
    </div>
  );
}
