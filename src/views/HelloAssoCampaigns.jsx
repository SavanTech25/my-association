import React, { useEffect, useState } from "react";
import { 
  Calendar, Users, Euro, Search, RefreshCw, X, 
  CalendarDays, ChevronRight, HelpCircle, UserCheck
} from "lucide-react";
import { 
  handleGetAllHelloAssoForms, 
  handleGetHelloAssoFormPayments,
  handleGetHelloAssoPayments
} from "../controllers/controller.helloasso";
import { handleGetMembers } from "../controllers/controller.member";
import { addMemberWithNumber } from "../backend/member.service";
import { toast } from "react-toastify";

const ORG_SLUG = process.env.REACT_APP_HELLOASSO_ORGANIZATION_SLUG || "abl";



const FORM_TYPE_LABELS = {
  Membership: "Adhésion",
  Donation: "Don",
  Event: "Événement",
  CrowdFunding: "Financement",
  PaymentForm: "Paiement libre"
};

const FORM_TYPE_COLORS = {
  Membership: "#6366f1",
  Donation: "#ec4899",
  Event: "#f59e0b",
  CrowdFunding: "#10b981",
  PaymentForm: "#8b5cf6"
};

export default function HelloAssoCampaigns() {
  const [campaigns, setCampaigns] = useState([]);
  const [selectedYear, setSelectedYear] = useState("all");
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [globalStats, setGlobalStats] = useState({ collected: 0, paymentsCount: 0 });
  
  // Detail Modal state
  const [activeCampaign, setActiveCampaign] = useState(null);
  const [activePayers, setActivePayers] = useState([]);
  const [loadingPayers, setLoadingPayers] = useState(false);
  const [importingMembers, setImportingMembers] = useState(false);
  const [campaignPage, setCampaignPage] = useState(1);
  const [payerPage, setPayerPage] = useState(1);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch campaigns and global payments in parallel
      const [realForms, globalPayments] = await Promise.all([
        handleGetAllHelloAssoForms(ORG_SLUG),
        handleGetHelloAssoPayments(ORG_SLUG, { pageSize: 100 })
      ]);

      // Calculate absolute general ledger totals
      let absoluteCollected = 0;
      let absoluteCount = 0;

      if (globalPayments && globalPayments.length > 0) {
        globalPayments.forEach(p => {
          const isSucceeded = p.state === "Processed" || p.state === "Authorized" || p.state === "Registered";
          if (isSucceeded) {
            absoluteCollected += (p.amount || 0) / 100;
            absoluteCount += 1;
          }
        });
      }
      setGlobalStats({ collected: absoluteCollected, paymentsCount: absoluteCount });

      if (realForms && realForms.length > 0) {
        // 2. Map forms to our rich Campaigns state
        const mapped = realForms.map(form => {
          const title = form.title || form.name || "";
          const match = title.match(/20\d{2}/);
          const year = match ? parseInt(match[0]) : new Date(form.createdAt || Date.now()).getFullYear();
          return {
            ...form,
            year,
            collected: 0,
            paymentsCount: 0,
            payers: []
          };
        });

        // 3. Match global payments using smart flexible matching
        if (globalPayments && globalPayments.length > 0) {
          globalPayments.forEach(p => {
            const isSucceeded = p.state === "Processed" || p.state === "Authorized" || p.state === "Registered";
            if (isSucceeded) {
              const amount = (p.amount || 0) / 100;
              // Fuzzy flexible mapping (slugs, lowercase, title equality)
              const campaign = mapped.find(c => 
                (c.formSlug && p.formSlug && c.formSlug.toLowerCase() === p.formSlug.toLowerCase()) ||
                (c.slug && p.formSlug && c.slug.toLowerCase() === p.formSlug.toLowerCase()) ||
                (c.title && p.formName && c.title.toLowerCase().trim() === p.formName.toLowerCase().trim()) ||
                (c.title && p.formSlug && c.title.toLowerCase().includes(p.formSlug.toLowerCase()))
              );

              if (campaign) {
                campaign.collected += amount;
                campaign.paymentsCount += 1;
                
                // Avoid double insertion
                const alreadyExists = campaign.payers.some(payer => 
                  payer.email === p.payer?.email && 
                  payer.amount === amount && 
                  payer.date === p.date
                );
                if (!alreadyExists) {
                  campaign.payers.push({
                    name: p.payer ? `${p.payer.firstName || ""} ${p.payer.lastName || ""}`.trim() : "Participant",
                    email: p.payer?.email || "—",
                    date: p.date || p.createdAt,
                    amount: amount,
                    status: p.state || "Processed"
                  });
                }
              }
            }
          });
        }

        // 4. Double check per-campaign payments via direct endpoints (Fallback)
        await Promise.all(
          mapped.map(async (campaign) => {
            try {
              const rawPayments = await handleGetHelloAssoFormPayments(
                ORG_SLUG,
                campaign.formType,
                campaign.formSlug || campaign.slug
              );

              if (rawPayments && rawPayments.length > 0) {
                rawPayments.forEach(p => {
                  const isSucceeded = p.state === "Processed" || p.state === "Authorized" || p.state === "Registered";
                  if (isSucceeded) {
                    const amount = (p.amount || 0) / 100;
                    
                    const alreadyAdded = campaign.payers.some(payer => 
                      payer.email === p.payer?.email && 
                      payer.amount === amount
                    );

                    if (!alreadyAdded) {
                      campaign.collected += amount;
                      campaign.paymentsCount += 1;
                      campaign.payers.push({
                        name: p.payer ? `${p.payer.firstName || ""} ${p.payer.lastName || ""}`.trim() : "Participant",
                        email: p.payer?.email || "—",
                        date: p.date || p.createdAt,
                        amount: amount,
                        status: p.state || "Processed"
                      });
                    }
                  }
                });
              }
            } catch (err) {
              console.error(`Error loading Fallback payments for campaign ${campaign.formSlug || campaign.slug}:`, err);
            }
          })
        );

        setCampaigns(mapped);
        setIsDemoMode(false);
      } else {
        setCampaigns([]);
        setIsDemoMode(false);
      }
    } catch (e) {
      console.warn("HelloAsso fetch failed, using empty state", e);
      setCampaigns([]);
      setIsDemoMode(false);
    }
    setLoading(false);
  };

  const handleImportPayersAsMembers = async (campaign) => {
    const payersToImport = activePayers && activePayers.length > 0 ? activePayers : campaign.payers;
    if (!payersToImport || payersToImport.length === 0) {
      toast.warning("Aucun participant à importer sur cette campagne.");
      return;
    }

    if (!window.confirm(`Voulez-vous vraiment importer les ${payersToImport.length} participants comme membres de l'association ?`)) {
      return;
    }

    setImportingMembers(true);
    try {
      // 1. Fetch current members to check for duplicates by email
      const existingMembers = await handleGetMembers();
      const existingEmails = new Set(
        existingMembers
          .filter(m => m.email)
          .map(m => m.email.toLowerCase().trim())
      );

      let importedCount = 0;
      let skippedCount = 0;

      // 2. Iterate through each payer and import if they don't exist
      for (const payer of payersToImport) {
        if (!payer.email || payer.email === "—") {
          skippedCount++;
          continue;
        }

        const emailClean = payer.email.toLowerCase().trim();
        if (existingEmails.has(emailClean)) {
          skippedCount++;
          continue;
        }

        // Parse name into firstName & lastName
        const nameParts = payer.name.split(" ");
        const firstName = nameParts[0] || "Participant";
        const lastName = nameParts.slice(1).join(" ") || "HelloAsso";

        // Construct new member
        const newMember = {
          firstname: firstName,
          lastname: lastName,
          email: emailClean,
          phone: "—",
          role: "membre",
          status: "active",
          joinDate: payer.date || new Date().toISOString(),
          isSubscribed: true,
        };

        // Add to Redis
        await addMemberWithNumber(newMember);
        
        // Add to local set to avoid duplicates within the loop
        existingEmails.add(emailClean);
        importedCount++;
      }

      if (importedCount > 0) {
        toast.success(`${importedCount} nouveaux membres ont été importés avec succès !`);
        if (skippedCount > 0) {
          toast.info(`${skippedCount} participants ont été ignorés car ils sont déjà enregistrés.`);
        }
      } else {
        toast.info("Tous les participants de cette campagne sont déjà enregistrés comme membres.");
      }
    } catch (error) {
      console.error("Error importing members from campaign:", error);
      toast.error("Une erreur est survenue lors de l'intégration des membres.");
    }
    setImportingMembers(false);
  };

  const onSync = async () => {
    setSyncing(true);
    await fetchData();
    toast.success("Synchronisation avec HelloAsso terminée !");
    setSyncing(false);
  };

  const handleOpenCampaignDetails = async (campaign) => {
    setActiveCampaign(campaign);
    setLoadingPayers(true);
    setPayerPage(1);

    if (isDemoMode || (campaign.payers && campaign.payers.length > 0)) {
      // Load pre-aggregated payments instantly
      setActivePayers(campaign.payers || []);
    } else {
      // Fetch fallback list of payments if empty
      try {
        const rawPayments = await handleGetHelloAssoFormPayments(ORG_SLUG, campaign.formType, campaign.formSlug);
        const mappedPayers = rawPayments.map(p => ({
          name: p.payer ? `${p.payer.firstName || ""} ${p.payer.lastName || ""}`.trim() : "Participant",
          email: p.payer?.email || "—",
          date: p.date || p.createdAt,
          amount: (p.amount || 0) / 100,
          status: p.state || "Processed"
        }));
        setActivePayers(mappedPayers);
      } catch (err) {
        toast.error("Impossible de charger les participants pour cette campagne.");
        setActivePayers([]);
      }
    }
    setLoadingPayers(false);
  };

  // Distinct Years
  const years = ["all", ...new Set(campaigns.map(c => c.year))].sort((a, b) => b - a);

  // Filtered campaigns
  const filteredCampaigns = campaigns.filter(c => {
    const yearMatch = selectedYear === "all" || String(c.year) === String(selectedYear);
    const searchMatch = c.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                        (c.formType && c.formType.toLowerCase().includes(searchQuery.toLowerCase()));
    return yearMatch && searchMatch;
  });
  
  useEffect(() => {
    setCampaignPage(1);
  }, [selectedYear, searchQuery]);

  const campaignsPerPage = 6;
  const campaignTotalPages = Math.ceil(filteredCampaigns.length / campaignsPerPage);
  const paginatedCampaigns = filteredCampaigns.slice((campaignPage - 1) * campaignsPerPage, campaignPage * campaignsPerPage);

  const payersPerPage = 5;
  const payerTotalPages = Math.ceil(activePayers.length / payersPerPage);
  const paginatedPayers = activePayers.slice((payerPage - 1) * payersPerPage, payerPage * payersPerPage);

  // Calculate high-level stats
  const totalCampaignsCount = filteredCampaigns.length;
  
  // Use maximum value from either campaign totals or absolute global ledger to prevent mismatching loss
  const totalFundsCollected = Math.max(
    filteredCampaigns.reduce((sum, c) => sum + (c.collected || 0), 0),
    globalStats.collected
  );
  
  const totalParticipants = Math.max(
    filteredCampaigns.reduce((sum, c) => sum + (c.paymentsCount || 0), 0),
    globalStats.paymentsCount
  );

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <div className="section-title">Campagnes HelloAsso</div>
          <div className="section-subtitle">
            Suivi annuel des adhésions, dons et inscriptions de votre association
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={onSync} disabled={syncing}>
            <RefreshCw size={14} style={{ animation: syncing ? "spin 0.8s linear infinite" : "none" }} />
            Synchroniser HelloAsso
          </button>
        </div>
      </div>

      {/* ── Demo Banner indicator ───────────────────────────────────────── */}
      {isDemoMode && (
        <div style={{
          display: "flex", alignItems: "center", gap: 12, marginBottom: 20,
          padding: "12px 16px", borderRadius: 10,
          background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.20)",
        }}>
          <HelpCircle size={18} style={{ color: "#f59e0b", flexShrink: 0 }} />
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)", flex: 1 }}>
            <strong style={{ color: "#f59e0b" }}>Mode Démo Activé</strong> — Vos clés API HelloAsso ne sont pas encore configurées dans votre fichier d'environnement.
            Vous visualisez actuellement des données de simulation réalistes pour tester l'interface.
          </div>
        </div>
      )}

      {/* ── High-level Stats Cards ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#6366f1" }} />
          <div className="stat-label">Campagnes actives</div>
          <div className="stat-value">
            <Calendar size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {totalCampaignsCount}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#10b981" }} />
          <div className="stat-label">Total Collecté</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            <Euro size={18} style={{ verticalAlign: "middle", marginRight: 4 }} />
            {totalFundsCollected.toLocaleString("fr-FR")} €
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#ec4899" }} />
          <div className="stat-label">Participants / Paiements</div>
          <div className="stat-value">
            <Users size={18} style={{ verticalAlign: "middle", marginRight: 6 }} />
            {totalParticipants}
          </div>
        </div>
      </div>

      {/* ── Filters Toolbar ────────────────────────────────────────────── */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "center",
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "12px 18px", marginBottom: 20, gap: 14
      }}>
        {/* Year picker */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontWeight: 600 }}>Filtrer par Année :</span>
          <div style={{ display: "flex", gap: 6 }}>
            {years.map(y => (
              <button
                key={y}
                className={selectedYear === y ? "btn-primary" : "btn-ghost"}
                onClick={() => setSelectedYear(y)}
                style={{ padding: "6px 12px", fontSize: "0.8rem", borderRadius: 8 }}
              >
                {y === "all" ? "Toutes" : y}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div style={{ position: "relative", width: 260 }}>
          <Search size={14} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
          <input
            type="text"
            className="form-input"
            placeholder="Rechercher une campagne..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ paddingLeft: 32, fontSize: "0.85rem", height: 36 }}
          />
        </div>
      </div>

      {/* ── Campaigns Grid List ────────────────────────────────────────── */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>
          <div style={{ width: 28, height: 28, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          Chargement de vos campagnes HelloAsso...
        </div>
      ) : filteredCampaigns.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "60px 20px", borderRadius: 12,
          background: "var(--bg-card)", border: "1px solid var(--border)"
        }}>
          <CalendarDays size={42} style={{ color: "var(--text-muted)", opacity: 0.4, marginBottom: 12 }} />
          <div style={{ fontWeight: 600, color: "var(--text-heading)", marginBottom: 4 }}>Aucune campagne trouvée</div>
          <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
            Aucun formulaire ne correspond à vos filtres actuels.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            {paginatedCampaigns.map(c => {
              const typeColor = FORM_TYPE_COLORS[c.formType] || "var(--primary)";
              const typeLabel = FORM_TYPE_LABELS[c.formType] || c.formType;

              return (
                <div 
                  key={c.id} 
                  className="admin-card" 
                  style={{ 
                    padding: 20, 
                    display: "flex", 
                    flexDirection: "column", 
                    justifyContent: "space-between",
                    cursor: "pointer", 
                    position: "relative",
                    transition: "transform 0.2s, box-shadow 0.2s"
                  }}
                  onClick={() => handleOpenCampaignDetails(c)}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.boxShadow = "0 6px 16px rgba(0,0,0,0.15)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}
                >
                  <div>
                    {/* Top Line */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <span 
                        style={{ 
                          fontSize: "0.72rem", 
                          fontWeight: 700, 
                          textTransform: "uppercase", 
                          letterSpacing: "0.5px", 
                          padding: "2px 8px", 
                          borderRadius: 20,
                          background: `rgba(${parseInt(typeColor.slice(1,3), 16)}, ${parseInt(typeColor.slice(3,5), 16)}, ${parseInt(typeColor.slice(5,7), 16)}, 0.12)`, 
                          color: typeColor 
                        }}
                      >
                        {typeLabel}
                      </span>
                      <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
                        <CalendarDays size={13} /> {c.year}
                      </span>
                    </div>

                    {/* Title */}
                    <h3 style={{ fontSize: "1.05rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: 16 }}>
                      {c.title}
                    </h3>
                  </div>

                  {/* Bottom stats details */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2 }}>Montant Collecté</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--success)" }}>
                        {c.collected.toLocaleString("fr-FR")} €
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: 2, textAlign: "right" }}>Payeurs</div>
                      <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "var(--text-heading)", textAlign: "right" }}>
                        {c.paymentsCount}
                      </div>
                    </div>
                    <div style={{ color: "var(--primary)", display: "flex", alignItems: "center" }}>
                      <ChevronRight size={18} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {campaignTotalPages > 1 && (
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "12px 18px", border: "1px solid var(--border)", borderRadius: 12,
              background: "var(--bg-card)", marginTop: 20
            }}>
              <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
                Page <strong>{campaignPage}</strong> sur <strong>{campaignTotalPages}</strong> ({filteredCampaigns.length} campagne(s))
              </span>
              <div style={{ display: "flex", gap: 8 }}>
                <button 
                  className="btn-ghost" 
                  onClick={() => setCampaignPage(prev => Math.max(prev - 1, 1))}
                  disabled={campaignPage === 1}
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  Précédent
                </button>
                <button 
                  className="btn-ghost" 
                  onClick={() => setCampaignPage(prev => Math.min(prev + 1, campaignTotalPages))}
                  disabled={campaignPage === campaignTotalPages}
                  style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Drawer details panel ───────────────────────────────────────── */}
      {activeCampaign && (
        <div 
          className="modal-overlay" 
          onClick={(e) => e.target === e.currentTarget && setActiveCampaign(null)}
          style={{ justifyContent: "flex-end" }} // creates a sliding side drawer look!
        >
          <div 
            className="modal-box" 
            style={{ 
              maxWidth: 550, 
              height: "100%", 
              borderRadius: "16px 0 0 16px", 
              display: "flex", 
              flexDirection: "column",
              margin: 0,
              animation: "slideInLeft 0.3s ease-out" 
            }}
          >
            {/* Header */}
            <div className="modal-header" style={{ padding: "20px 24px" }}>
              <div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                  <span style={{ 
                    fontSize: "0.7rem", 
                    fontWeight: 700, 
                    padding: "1px 8px", 
                    borderRadius: 20, 
                    background: "var(--border)", 
                    color: "var(--text-muted)" 
                  }}>
                    {FORM_TYPE_LABELS[activeCampaign.formType] || activeCampaign.formType}
                  </span>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Campagne {activeCampaign.year}</span>
                </div>
                <div className="modal-title" style={{ fontSize: "1.15rem", lineHeight: 1.3 }}>{activeCampaign.title}</div>
              </div>
              <button className="modal-close" onClick={() => setActiveCampaign(null)}>
                <X size={16} />
              </button>
            </div>

            {/* Content list */}
            <div className="modal-body" style={{ flex: 1, overflowY: "auto", padding: "0 24px 20px" }}>
              {/* Campaign Quick Summary */}
              <div style={{ 
                display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, 
                background: "rgba(99,102,241,0.05)", border: "1px solid rgba(99,102,241,0.1)",
                borderRadius: 10, padding: 14, marginBottom: 20
              }}>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Total Collecté</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--success)" }}>
                    {activeCampaign.collected.toLocaleString("fr-FR")} €
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>Nombre de payeurs</div>
                  <div style={{ fontSize: "1.2rem", fontWeight: 800, color: "var(--text-heading)" }}>
                    {activeCampaign.paymentsCount}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: 12 }}>
                Membres ayant payé ({activePayers.length}) :
              </div>

              {loadingPayers ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <div style={{ width: 20, height: 20, border: "2px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 8px" }} />
                  Chargement de la liste...
                </div>
              ) : activePayers.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 0", color: "var(--text-muted)" }}>
                  <Users size={32} style={{ opacity: 0.3, marginBottom: 8, margin: "0 auto" }} />
                  <p style={{ fontSize: "0.82rem" }}>Aucun paiement enregistré pour cette campagne.</p>
                </div>
              ) : (
                <>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {paginatedPayers.map((p, index) => (
                      <div 
                        key={index} 
                        style={{ 
                          background: "var(--bg-card)", 
                          border: "1px solid var(--border)", 
                          borderRadius: 10, 
                          padding: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between"
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div style={{
                            width: 32, height: 32, borderRadius: "50%",
                            background: "linear-gradient(135deg, var(--primary), #8b5cf6)",
                            display: "grid", placeItems: "center",
                            fontWeight: 700, fontSize: "0.78rem", color: "white", flexShrink: 0,
                          }}>
                            {(p.name?.[0] || "?").toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--text-heading)" }}>{p.name}</div>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{p.email}</div>
                            <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginTop: 2 }}>
                              Reçu le : {new Date(p.date).toLocaleDateString("fr-FR")}
                            </div>
                          </div>
                        </div>

                        <div style={{ textAlign: "right" }}>
                          <div style={{ fontWeight: 700, color: "var(--success)", fontSize: "0.9rem" }}>
                            +{p.amount.toLocaleString("fr-FR")} €
                          </div>
                          <span style={{ 
                            fontSize: "0.68rem", 
                            fontWeight: 700, 
                            color: "#10b981", 
                            background: "rgba(16,185,129,0.08)",
                            padding: "2px 6px",
                            borderRadius: 10,
                            marginTop: 4,
                            display: "inline-block"
                          }}>
                            Payé
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Payer list pagination footer */}
                  {payerTotalPages > 1 && (
                    <div style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 14px", border: "1px solid var(--border)", borderRadius: 10,
                      background: "var(--bg-card)", marginTop: 12
                    }}>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Page <strong>{payerPage}</strong> sur <strong>{payerTotalPages}</strong>
                      </span>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button 
                          className="btn-ghost" 
                          onClick={() => setPayerPage(prev => Math.max(prev - 1, 1))}
                          disabled={payerPage === 1}
                          style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "auto", height: 28 }}
                        >
                          Précédent
                        </button>
                        <button 
                          className="btn-ghost" 
                          onClick={() => setPayerPage(prev => Math.min(prev + 1, payerTotalPages))}
                          disabled={payerPage === payerTotalPages}
                          style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "auto", height: 28 }}
                        >
                          Suivant
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="modal-footer" style={{ 
              padding: "16px 24px", 
              background: "var(--bg-card)", 
              borderTop: "1px solid var(--border)",
              display: "flex",
              flexDirection: "column",
              gap: 10
            }}>
              {(activeCampaign.formType === "Membership" || 
                activeCampaign.title.toLowerCase().includes("cotisation") || 
                activeCampaign.title.toLowerCase().includes("adhésion") ||
                activeCampaign.title.toLowerCase().includes("membre")) && activePayers.length > 0 && (
                <button 
                  style={{ 
                    width: "100%", 
                    justifyContent: "center", 
                    display: "flex", 
                    alignItems: "center", 
                    gap: 8,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    padding: "10px 16px",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    cursor: "pointer",
                    transition: "opacity 0.2s"
                  }} 
                  onClick={() => handleImportPayersAsMembers(activeCampaign)}
                  disabled={importingMembers}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
                >
                  {importingMembers ? (
                    <>
                      <div style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      Intégration en cours...
                    </>
                  ) : (
                    <>
                      <UserCheck size={16} />
                      Intégrer les payeurs comme membres ({activePayers.length})
                    </>
                  )}
                </button>
              )}
              <button className="btn-primary" style={{ width: "100%" }} onClick={() => setActiveCampaign(null)}>
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Style tweaks */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideInLeft {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>
    </div>
  );
}
