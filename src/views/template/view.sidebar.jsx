import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  LayoutDashboard,
  Users,
  Wallet,
  FileText,
  CalendarDays,
  HeartHandshake,
  FolderKanban,
  Settings,
  LogOut,
  RefreshCw,
  CreditCard,
  Sparkles,
  Briefcase,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { handleLogout } from "../../controllers/controller.user";

// Map of nav items per role
const NAV_ITEMS = [
  {
    section: "Vue Générale",
    items: [
      { id: "dashboard", label: "Tableau de bord", icon: LayoutDashboard, roles: ["president", "tresorier", "secretaire", "membre"] },
      { id: "tools",     label: "Boîte à outils",  icon: Sparkles,        roles: ["president", "tresorier", "secretaire", "membre"] },
    ],
  },
  {
    section: "Gestion",
    items: [
      { id: "members",   label: "Membres",       icon: Users,          roles: ["president", "secretaire"] },
      { id: "treasury",  label: "Trésorerie",    icon: Wallet,         roles: ["president", "tresorier"] },
      { id: "secretary", label: "Secrétariat",   icon: FileText,       roles: ["president", "secretaire"] },
      { id: "events",    label: "Événements",    icon: CalendarDays,   roles: ["president", "tresorier", "secretaire"] },
      { id: "helloasso", label: "HelloAsso",     icon: CreditCard,     roles: ["president", "tresorier", "secretaire"] },
      { id: "donations", label: "Dons",          icon: HeartHandshake, roles: ["president", "tresorier"] },
      { id: "projects",  label: "Projets",       icon: FolderKanban,   roles: ["president"] },
    ],
  },
  {
    section: "Administration",
    items: [
      { id: "partners",  label: "Partenaires",   icon: Briefcase,      roles: ["president"] },
      { id: "settings",  label: "Paramètres",    icon: Settings,       roles: ["president"] },
    ],
  },
];

const ROLE_LABELS = {
  president:  "Président",
  tresorier:  "Trésorier",
  secretaire: "Secrétaire",
  membre:     "Membre",
};

export default function ViewSidebar({ activePage, setActivePage, isMobileMenuOpen, setIsMobileMenuOpen, isCollapsed, setIsCollapsed }) {
  const dispatch   = useDispatch();
  const user       = useSelector((s) => s.userReducer.user);
  const role       = user?.role || "membre";
  const initials   = ((user?.firstname?.[0] || "") + (user?.lastname?.[0] || "")).toUpperCase() || "?";
  const fullName   = user?.firstname && user?.lastname
    ? `${user.firstname} ${user.lastname}`
    : (user?.email || "Utilisateur");

  const [syncPulse, setSyncPulse] = useState(false);

  const onLogout = () => handleLogout(dispatch);

  const handleSync = () => {
    setSyncPulse(true);
    setTimeout(() => setSyncPulse(false), 1200);
  };

  return (
    <aside className={`admin-sidebar ${isMobileMenuOpen ? "sidebar-open" : ""}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="/assets/images/logo.jpg" alt="Logo" className="sidebar-logo-icon" style={{ objectFit: "cover", background: "none", border: "1px solid var(--border)" }} />
        <div className="sidebar-logo-text">
          Mon Asso <span>/ Admin</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV_ITEMS.map((section) => {
          const visible = section.items.filter((i) => i.roles.includes(role));
          if (!visible.length) return null;
          return (
            <div key={section.section}>
              <div className="sidebar-section-label">{section.section}</div>
              {visible.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    className={`sidebar-nav-item${activePage === item.id ? " active" : ""}`}
                    onClick={() => { setActivePage(item.id); setIsMobileMenuOpen?.(false); }}
                  >
                    <Icon className="nav-icon" size={18} />
                    <span className="sidebar-nav-item-label">{item.label}</span>
                  </button>
                );
              })}
            </div>
          );
        })}
      </nav>

      {/* Sync Button */}
      <div style={{ padding: "0 16px 8px" }}>
        <button
          className="btn-ghost"
          style={{ width: "100%", justifyContent: "center", gap: 8, fontSize: "0.82rem" }}
          onClick={handleSync}
        >
          <RefreshCw size={14} style={{ animation: syncPulse ? "spin 0.8s linear" : "none" }} />
          Sync HelloAsso
        </button>
      </div>

      {/* User Footer */}
      <div className="sidebar-footer">
        <button 
          className="btn-ghost" 
          style={{ width: "100%", justifyContent: "center", marginBottom: 16, padding: "8px" }}
          onClick={() => setIsCollapsed(!isCollapsed)}
          title={isCollapsed ? "Agrandir le menu" : "Réduire le menu"}
        >
          {isCollapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} /> <span className="sidebar-nav-item-label">Réduire le menu</span></>}
        </button>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{fullName}</div>
            <div className="sidebar-user-role">{ROLE_LABELS[role] || role}</div>
          </div>
          <button className="sidebar-logout-btn" onClick={onLogout} title="Déconnexion">
            <LogOut size={16} />
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </aside>
  );
}