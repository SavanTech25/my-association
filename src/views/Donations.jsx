import React, { useEffect, useState } from "react";
import {
  RefreshCw, HeartHandshake, ExternalLink, Plus, X,
  TrendingUp, Users, Euro, AlertCircle, CheckCircle, Clock,
} from "lucide-react";
import { handleGetDonations, handleCreateDonationLink } from "../controllers/controller.helloasso";
import { toast } from "react-toastify";

const ORG_SLUG = process.env.REACT_APP_HELLOASSO_ORGANIZATION_SLUG || "abl";

const STATUS_CONFIG = {
  Processed:      { label: "Traité",     color: "var(--success)",  bg: "rgba(16,185,129,0.12)", Icon: CheckCircle },
  Authorized:     { label: "Autorisé",   color: "#6366f1",         bg: "rgba(99,102,241,0.12)", Icon: CheckCircle },
  Pending:        { label: "En attente", color: "#f59e0b",         bg: "rgba(245,158,11,0.12)", Icon: Clock },
  Refused:        { label: "Refusé",     color: "var(--danger)",   bg: "rgba(239,68,68,0.12)",  Icon: AlertCircle },
  Registered:     { label: "Enregistré", color: "var(--success)",  bg: "rgba(16,185,129,0.12)", Icon: CheckCircle },
};

const INITIAL_LINK_FORM = {
  amount: "",
  firstName: "",
  lastName: "",
  email: "",
  message: "",
};

export default function Donations() {
  const [donations, setDonations]     = useState([]);
  const [forms, setForms]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [syncing, setSyncing]         = useState(false);
  const [showModal, setShowModal]     = useState(false);
  const [generating, setGenerating]   = useState(false);
  const [linkForm, setLinkForm]       = useState(INITIAL_LINK_FORM);
  const [selectedForm, setSelectedForm] = useState("");
  const [generatedLink, setGeneratedLink] = useState(null);
  const [selectedYear, setSelectedYear]   = useState("all");
  const [currentPage, setCurrentPage]     = useState(1);

  useEffect(() => { fetchDonations(); }, []);

  const fetchDonations = async () => {
    setLoading(true);
    const { donations: d, forms: f } = await handleGetDonations(ORG_SLUG);
    setDonations(d || []);
    setForms(f || []);
    if (f?.length > 0) setSelectedForm(f[0]?.formSlug || f[0]?.slug || "");
    setLoading(false);
  };

  const onSync = async () => {
    setSyncing(true);
    await fetchDonations();
    toast.info("Dons synchronisés depuis HelloAsso");
    setSyncing(false);
  };

  const onGenerateLink = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setGeneratedLink(null);

    const amountCents = Math.round(parseFloat(linkForm.amount) * 100);
    const params = {
      totalAmount: amountCents,
      initialAmount: amountCents,
      itemName: "Don à l'Association des Burkinabè de Lyon",
      backUrl: window.location.origin,
      errorUrl: window.location.origin,
      returnUrl: window.location.origin,
      payer: {
        firstName: linkForm.firstName,
        lastName:  linkForm.lastName,
        email:     linkForm.email,
      },
      metadata: linkForm.message ? { comment: linkForm.message } : undefined,
    };

    const url = await handleCreateDonationLink(ORG_SLUG, selectedForm, params);
    if (url) {
      setGeneratedLink(url);
      toast.success("Lien de don généré !");
    }
    setGenerating(false);
  };

  // ── Stats, Filtering & Grouping ──────────────────────────────────────────
  const years = Array.from(new Set(donations.map(d => {
    if (!d.date) return null;
    return new Date(d.date).getFullYear();
  }).filter(Boolean))).sort((a, b) => b - a);

  const filteredDonations = donations.filter(d => {
    if (selectedYear === "all") return true;
    if (!d.date) return false;
    return new Date(d.date).getFullYear().toString() === selectedYear;
  });

  const activityGroups = filteredDonations.reduce((acc, d) => {
    const key = d.formName || "Autre";
    if (!acc[key]) {
      acc[key] = { amount: 0, count: 0 };
    }
    acc[key].amount += d.amount || 0;
    acc[key].count += 1;
    return acc;
  }, {});

  const totalAmount  = filteredDonations.reduce((s, d) => s + (d.amount || 0), 0);
  const totalDonors  = new Set(filteredDonations.map((d) => d.email).filter(Boolean)).size;
  const avgAmount    = filteredDonations.length > 0 ? (totalAmount / filteredDonations.length).toFixed(2) : 0;

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredDonations.length / itemsPerPage);
  const paginatedDonations = filteredDonations.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <div className="section-title">Gestion des Dons</div>
          <div className="section-subtitle">
            Dons récupérés depuis HelloAsso · {donations.length} don(s) trouvé(s)
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={onSync} disabled={syncing}>
            <RefreshCw size={14} style={{ animation: syncing ? "spin 0.8s linear infinite" : "none" }} />
            Sync HelloAsso
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Créer un lien de don
          </button>
        </div>
      </div>

      {/* ── Stats ───────────────────────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#ec4899" }} />
          <div className="stat-label">Total des dons</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            <Euro size={18} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {totalAmount.toFixed(2)} €
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#6366f1" }} />
          <div className="stat-label">Donateurs uniques</div>
          <div className="stat-value">
            <Users size={18} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {totalDonors}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#10b981" }} />
          <div className="stat-label">Don moyen</div>
          <div className="stat-value">
            <TrendingUp size={18} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {avgAmount} €
          </div>
        </div>
      </div>

      {/* ── Filter Bar ─────────────────────────────────────────────────── */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "12px 18px", marginBottom: 20,
        display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 500 }}>Filtrer par année :</span>
          <select
            value={selectedYear}
            onChange={(e) => { setSelectedYear(e.target.value); setCurrentPage(1); }}
            style={{
              background: "var(--bg-body)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 12px", color: "var(--text-heading)",
              fontSize: "0.85rem", outline: "none", cursor: "pointer", fontWeight: 600
            }}
          >
            <option value="all">Toutes les années</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
        <div style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
          {filteredDonations.length} don(s) correspondant(s)
        </div>
      </div>

      {/* ── Grouped by Activity Summary ─────────────────────────────────── */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ fontWeight: 700, fontSize: "0.95rem", marginBottom: 12, color: "var(--text-heading)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Répartition par Activité {selectedYear !== "all" ? `(${selectedYear})` : "(Toutes les années)"}
        </div>
        {Object.keys(activityGroups).length === 0 ? (
          <div style={{
            background: "var(--bg-card)", border: "1px solid var(--border)", borderRadius: 10,
            padding: "20px 24px", color: "var(--text-muted)", fontStyle: "italic", fontSize: "0.85rem"
          }}>
            Aucune activité enregistrée.
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(250px, 1fr))", gap: 14 }}>
            {Object.entries(activityGroups).map(([activityName, stats]) => (
              <div key={activityName} className="stat-card" style={{ padding: "16px 20px" }}>
                <div className="stat-card-glow" style={{ background: "linear-gradient(135deg, #ec4899, #6366f1)" }} />
                <div style={{ fontWeight: 700, fontSize: "0.88rem", color: "var(--text-heading)", marginBottom: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={activityName}>
                  {activityName}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                  <span style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--success)" }}>
                    {stats.amount.toFixed(2)} €
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                    {stats.count} don(s)
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── HelloAsso info banner ────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 20,
        padding: "12px 16px", borderRadius: 10,
        background: "rgba(99,102,241,0.08)", border: "1px solid rgba(99,102,241,0.2)",
      }}>
        <HeartHandshake size={18} style={{ color: "#6366f1", flexShrink: 0, marginTop: 2 }} />
        <div style={{ fontSize: "0.84rem", color: "var(--text-muted)", lineHeight: 1.5 }}>
          <strong style={{ color: "var(--text-heading)" }}>Données HelloAsso</strong> — Les dons sont importés directement depuis votre compte HelloAsso.
          Le bouton <strong>"Créer un lien de don"</strong> génère un lien de paiement sécurisé à partager avec le donateur.
        </div>
        <a
          href={`https://www.helloasso.com/associations/${ORG_SLUG}`}
          target="_blank" rel="noreferrer"
          style={{ marginLeft: "auto", color: "#6366f1", display: "flex", alignItems: "center", gap: 4, fontSize: "0.82rem", whiteSpace: "nowrap", flexShrink: 0 }}
        >
          <ExternalLink size={13} /> Ouvrir HelloAsso
        </a>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="admin-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            Chargement des dons…
          </div>
        ) : filteredDonations.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 24px", color: "var(--text-muted)" }}>
            <HeartHandshake size={40} style={{ opacity: 0.3, marginBottom: 12 }} />
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Aucun don trouvé</div>
            <div style={{ fontSize: "0.85rem" }}>
              {selectedYear !== "all" 
                ? `Aucun don enregistré pour l'année ${selectedYear}.` 
                : "Synchronisez HelloAsso ou créez un lien de don pour commencer."}
            </div>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Donateur</th>
                    <th>Email</th>
                    <th>Campagne</th>
                    <th>Date</th>
                    <th>Statut</th>
                    <th style={{ textAlign: "right" }}>Montant</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedDonations.map((d, i) => {
                    const s = STATUS_CONFIG[d.status] || STATUS_CONFIG.Processed;
                    const StatusIcon = s.Icon;
                    return (
                      <tr key={d.id || i}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 32, height: 32, borderRadius: "50%",
                              background: "linear-gradient(135deg, #ec4899, #6366f1)",
                              display: "grid", placeItems: "center",
                              fontWeight: 700, fontSize: "0.8rem", color: "white", flexShrink: 0,
                            }}>
                              {(d.donorName?.[0] || "?").toUpperCase()}
                            </div>
                            <div style={{ fontWeight: 600 }}>{d.donorName || "Anonyme"}</div>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{d.email}</td>
                        <td style={{ fontSize: "0.85rem" }}>{d.formName}</td>
                        <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                          {d.date ? new Date(d.date).toLocaleDateString("fr-FR") : "—"}
                        </td>
                        <td>
                          <span style={{
                            display: "inline-flex", alignItems: "center", gap: 5,
                            fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px",
                            borderRadius: 20, color: s.color, background: s.bg,
                          }}>
                            <StatusIcon size={11} /> {s.label}
                          </span>
                        </td>
                        <td style={{ textAlign: "right", fontWeight: 700, color: "var(--success)" }}>
                          +{d.amount?.toFixed(2)} €
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                padding: "14px 24px", borderTop: "1px solid var(--border)",
                background: "var(--bg-card)", borderBottomLeftRadius: 12, borderBottomRightRadius: 12
              }}>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                  Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong> ({filteredDonations.length} élément(s))
                </span>
                <div style={{ display: "flex", gap: 8 }}>
                  <button 
                    className="btn-ghost" 
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    Précédent
                  </button>
                  <button 
                    className="btn-ghost" 
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                  >
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Modal: Create donation link ──────────────────────────────────── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">
                <HeartHandshake size={18} style={{ marginRight: 8, verticalAlign: "middle", color: "#ec4899" }} />
                Créer un lien de don HelloAsso
              </div>
              <button className="modal-close" onClick={() => { setShowModal(false); setGeneratedLink(null); setLinkForm(INITIAL_LINK_FORM); }}>
                <X size={16} />
              </button>
            </div>

            {/* Generated link result */}
            {generatedLink ? (
              <div className="modal-body">
                <div style={{
                  padding: 16, borderRadius: 12,
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)",
                  marginBottom: 16,
                }}>
                  <div style={{ fontWeight: 700, color: "var(--success)", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}>
                    <CheckCircle size={16} /> Lien généré avec succès !
                  </div>
                  <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", wordBreak: "break-all", marginBottom: 12 }}>
                    {generatedLink}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      className="btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => window.open(generatedLink, "_blank")}
                    >
                      <ExternalLink size={14} /> Ouvrir le lien
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => { navigator.clipboard.writeText(generatedLink); toast.success("Lien copié !"); }}
                    >
                      Copier
                    </button>
                  </div>
                </div>
                <button className="btn-ghost" style={{ width: "100%" }} onClick={() => { setGeneratedLink(null); setLinkForm(INITIAL_LINK_FORM); }}>
                  Créer un autre lien
                </button>
              </div>
            ) : (
              <form onSubmit={onGenerateLink}>
                <div className="modal-body">

                  {/* Info note */}
                  <div style={{
                    padding: "10px 14px", borderRadius: 8, marginBottom: 18,
                    background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)",
                    fontSize: "0.8rem", color: "#d97706", lineHeight: 1.5,
                  }}>
                    ⚡ Un lien de paiement sécurisé sera généré via HelloAsso et envoyé au donateur.
                    Le donateur complète le paiement sur la plateforme HelloAsso.
                  </div>

                  {/* Donation form selector */}
                  {forms.length > 0 && (
                    <div style={{ marginBottom: 14 }}>
                      <label className="form-label">Campagne de don</label>
                      <select className="form-select" value={selectedForm} onChange={(e) => setSelectedForm(e.target.value)}>
                        {forms.map((f) => (
                          <option key={f.formSlug || f.slug} value={f.formSlug || f.slug}>
                            {f.title || f.name || f.formSlug}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Amount */}
                  <div style={{ marginBottom: 14 }}>
                    <label className="form-label">Montant (€) *</label>
                    <input
                      type="number" className="form-input" placeholder="50" min="1" step="0.01"
                      value={linkForm.amount}
                      onChange={(e) => setLinkForm({ ...linkForm, amount: e.target.value })}
                      required
                    />
                  </div>

                  {/* Donor info */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                    <div>
                      <label className="form-label">Prénom du donateur</label>
                      <input className="form-input" placeholder="Jean"
                        value={linkForm.firstName} onChange={(e) => setLinkForm({ ...linkForm, firstName: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Nom du donateur</label>
                      <input className="form-input" placeholder="Dupont"
                        value={linkForm.lastName} onChange={(e) => setLinkForm({ ...linkForm, lastName: e.target.value })} />
                    </div>
                  </div>
                  <div style={{ marginBottom: 14 }}>
                    <label className="form-label">Email du donateur</label>
                    <input type="email" className="form-input" placeholder="jean@email.fr"
                      value={linkForm.email} onChange={(e) => setLinkForm({ ...linkForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Message / Note (optionnel)</label>
                    <input className="form-input" placeholder="Don pour la fête de l'Indépendance"
                      value={linkForm.message} onChange={(e) => setLinkForm({ ...linkForm, message: e.target.value })} />
                  </div>

                </div>
                <div className="modal-footer">
                  <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                  <button type="submit" className="btn-primary" disabled={generating}>
                    {generating ? (
                      <>
                        <span style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block", marginRight: 6 }} />
                        Génération…
                      </>
                    ) : (
                      <><HeartHandshake size={15} /> Générer le lien</>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
