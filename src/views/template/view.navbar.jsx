import React from "react";
import { useSelector } from "react-redux";
import { Menu } from "lucide-react";

const PAGE_TITLES = {
  dashboard: "Tableau de Bord",
  members:   "Gestion des Membres",
  treasury:  "Trésorerie",
  secretary: "Secrétariat",
  events:    "Événements",
  donations: "Dons",
  projects:  "Projets",
  partners:  "Partenaires & Sponsors",
  settings:  "Paramètres",
};

export default function ViewNavbar({ activePage, isMobileMenuOpen, setIsMobileMenuOpen }) {
  const user = useSelector((s) => s.userReducer.user);

  return (
    <header className="admin-topbar">
      <div style={{ display: "flex", alignItems: "center" }}>
        <button className="hamburger-menu" onClick={() => setIsMobileMenuOpen?.(!isMobileMenuOpen)}>
          <Menu size={20} />
        </button>
        <div className="topbar-page-title">{PAGE_TITLES[activePage] || "Mon Asso"}</div>
      </div>

      <div className="topbar-actions">

        <div
          style={{
            width: 34, height: 34,
            borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #ec4899)",
            display: "grid",
            placeItems: "center",
            fontWeight: 700,
            fontSize: "0.85rem",
            color: "white",
          }}
        >
          {((user?.firstname?.[0] || "") + (user?.lastname?.[0] || "")).toUpperCase() || "?"}
        </div>
      </div>
    </header>
  );
}