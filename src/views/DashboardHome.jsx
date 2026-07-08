import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Users, Wallet, CalendarDays, HeartHandshake, TrendingUp, TrendingDown } from "lucide-react";
import { getAllMembers } from "../backend/member.service";
import { getCurrentBalance, getAllFinanceEntries } from "../backend/finance.service";
import { getAllMeetings } from "../backend/meeting.service";

const StatCard = ({ icon: Icon, label, value, color, trend }) => (
  <div className="stat-card">
    <div className="stat-card-glow" style={{ background: color }} />
    <div className="stat-icon" style={{ background: `${color}22` }}>
      <Icon size={22} style={{ color }} />
    </div>
    <div className="stat-value" style={{ color }}>{value}</div>
    <div className="stat-label">{label}</div>
    {trend !== undefined && (
      <div className="stat-trend" style={{ color: trend >= 0 ? "var(--success)" : "var(--danger)" }}>
        {trend >= 0 ? <TrendingUp size={13} style={{ marginRight: 3 }} /> : <TrendingDown size={13} style={{ marginRight: 3 }} />}
        {Math.abs(trend)}% ce mois
      </div>
    )}
  </div>
);

export default function DashboardHome() {
  const user = useSelector((s) => s.userReducer.user);
  const [stats, setStats] = useState({ members: 0, balance: 0, meetings: 0, income: 0 });
  const [recentEntries, setRecentEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [members, balance, meetings, entries] = await Promise.all([
          getAllMembers(),
          getCurrentBalance(),
          getAllMeetings(),
          getAllFinanceEntries(),
        ]);
        setStats({
          members: members.length,
          balance,
          meetings: meetings.length,
          income: entries.filter((e) => e.type === "income").reduce((s, e) => s + (e.amount || 0), 0),
        });
        setRecentEntries(entries.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
      setLoading(false);
    };
    load();
  }, []);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Bonjour" : hour < 18 ? "Bon après-midi" : "Bonsoir";

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      {/* Welcome */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, margin: 0, color: "var(--text-heading)" }}>
          {greeting}, {user?.firstname || "Admin"} 👋
        </h1>
        <p style={{ color: "var(--text-muted)", margin: "6px 0 0", fontSize: "0.92rem" }}>
          Voici une vue d'ensemble de votre association.
        </p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <div style={{ width: 32, height: 32, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Chargement…
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 20, marginBottom: 28 }}>
            <StatCard icon={Users}          label="Membres actifs"  value={stats.members}           color="#6366f1" trend={5} />
            <StatCard icon={Wallet}         label="Solde (€)"       value={`${stats.balance}€`}     color="#10b981" trend={12} />
            <StatCard icon={CalendarDays}   label="Réunions"        value={stats.meetings}           color="#06b6d4" />
            <StatCard icon={HeartHandshake} label="Total recettes"  value={`${stats.income}€`}      color="#f59e0b" />
          </div>

          {/* Recent Transactions */}
          <div className="admin-card">
            <div className="section-header">
              <div>
                <div className="section-title">Transactions récentes</div>
                <div className="section-subtitle">Les 5 dernières écritures comptables</div>
              </div>
            </div>
            {recentEntries.length === 0 ? (
              <p style={{ textAlign: "center", color: "var(--text-muted)", padding: "32px 0" }}>
                Aucune transaction enregistrée.
              </p>
            ) : (
              <div className="admin-table-wrapper">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Motif</th>
                      <th>Type</th>
                      <th>Montant</th>
                      <th>Solde après</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentEntries.map((e, i) => (
                      <tr key={e.id || i}>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          {new Date(e.date).toLocaleDateString("fr-FR")}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{e.motive}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{e.recipient}</div>
                        </td>
                        <td>
                          <span className={`badge-role ${e.type === "income" ? "badge-status-active" : "badge-status-inactive"}`}>
                            {e.type === "income" ? "Recette" : "Dépense"}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: e.type === "income" ? "var(--success)" : "var(--danger)" }}>
                          {e.type === "income" ? "+" : "-"}{e.amount}€
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{e.balanceAfter}€</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
