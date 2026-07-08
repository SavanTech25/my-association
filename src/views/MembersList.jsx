import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Plus, Trash2, RefreshCw, UserCheck, X, CreditCard, FileText, Download, Hash, Search, Edit } from "lucide-react";
import { handleGetMembers, handleDeleteMember, handleUpdateMember } from "../controllers/controller.member";
import { handleCreateAdminUser } from "../controllers/controller.user";
import { handleGetHelloAssoPayments } from "../controllers/controller.helloasso";
import { addMemberWithNumber } from "../backend/member.service";
import { downloadMemberCard, getMemberCardBase64 } from "../services/service.memberCard";
import { downloadReceipt, getReceiptBase64 } from "../services/service.receipt";
import { sendMemberCardEmail } from "../services/service.email";
import { toast } from "react-toastify";

const ROLE_BADGE = {
  president:  "badge-role badge-president",
  tresorier:  "badge-role badge-tresorier",
  secretaire: "badge-role badge-secretaire",
  membre:     "badge-role badge-membre",
};

const ROLE_LABELS = {
  president: "Président", tresorier: "Trésorier",
  secretaire: "Secrétaire", membre: "Membre",
};

const ADMIN_ROLES = ["president", "tresorier", "secretaire"];

const INITIAL_FORM = {
  firstname: "", lastname: "", email: "", phone: "", password: "",
  role: "membre", status: "active",
  address: "", profession: "",
  joinDate: new Date().toISOString().split("T")[0],
  subscriptionType: "annuel", amount: "", paymentMethod: "virement",
};

const INITIAL_DOCS = {
  carteMembre: false,
  recu: false,
};

export default function MembersList() {
  const user = useSelector((s) => s.userReducer.user);
  const [members, setMembers]     = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading]     = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [savingStep, setSavingStep] = useState("");
  const [syncing, setSyncing]     = useState(false);
  const [form, setForm]           = useState(INITIAL_FORM);
  const [docs, setDocs]           = useState(INITIAL_DOCS);
  const [adminPwd, setAdminPwd]   = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [editingMemberId, setEditingMemberId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchMembers(); }, []);

  const fetchMembers = async () => {
    setLoading(true);
    const data = await handleGetMembers();
    setMembers(data);
    setLoading(false);
  };

  const closeModal = () => {
    setShowModal(false);
    setForm(INITIAL_FORM);
    setDocs(INITIAL_DOCS);
    setAdminPwd("");
    setSavingStep("");
    setEditingMemberId(null);
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    if (editingMemberId) {
      setSavingStep("Mise à jour…");
      const success = await handleUpdateMember(editingMemberId, {
        firstname: form.firstname,
        lastname: form.lastname,
        email: form.email,
        phone: form.phone,
        role: form.role,
        status: form.status,
        joinDate: form.joinDate,
      });
      if (success) {
        await fetchMembers();
        closeModal();
      }
      setSaving(false);
      setSavingStep("");
      return;
    }

    let createdMember = null;

    try {
      if (ADMIN_ROLES.includes(form.role)) {
        // Admin roles: use Redis flow (member details with login password)
        setSavingStep("Création du compte…");
        const { password, ...firestoreData } = form;
        const success = await handleCreateAdminUser(
          { ...firestoreData, password },
          user?.email,
          adminPwd
        );
        if (!success) { setSaving(false); setSavingStep(""); return; }
        // For admin roles, fetch the just-created member to get its data
        await fetchMembers();
      } else {
        // Regular member: use addMemberWithNumber to get the full member object back
        setSavingStep("Création du membre…");
        const { password, ...firestoreData } = form;
        createdMember = await addMemberWithNumber(firestoreData);
        toast.success(`Membre ${createdMember.firstname} ajouté — N° ${createdMember.memberNumber}`);
        await fetchMembers();
      }

      // ── Document generation ──────────────────────────────────────────────
      if (createdMember && (docs.carteMembre || docs.recu)) {
        let cardBase64 = null;
        let receiptBase64 = null;

        // Generate PDF and download (async - loads real images)
        if (docs.carteMembre) {
          setSavingStep("Génération de la carte…");
          await downloadMemberCard(createdMember);
          cardBase64 = await getMemberCardBase64(createdMember);
        }

        if (docs.recu) {
          setSavingStep("Génération du reçu…");
          await downloadReceipt(createdMember);
          receiptBase64 = await getReceiptBase64(createdMember);
        }

        // Send email notification
        if (createdMember.email) {
          setSavingStep("Envoi de l'email…");
          // Overriding the email to test as requested by user if we need, but best to use the member's email
          // createdMember.email is used by the EmailJS params. 
          const emailSent = await sendMemberCardEmail(createdMember, cardBase64, receiptBase64);
          if (emailSent) {
            toast.success("Email de bienvenue envoyé à " + createdMember.email);
          } else {
            toast.warning("Documents générés, mais l'email n'a pas pu être envoyé. Vérifiez la console.");
          }
        }
      }

      closeModal();
    } catch (err) {
      console.error("Member creation error:", err);
      toast.error("Erreur lors de la création du membre.");
    }

    setSaving(false);
    setSavingStep("");
  };

  const onDelete = async (id) => {
    const ok = await handleDeleteMember(id);
    if (ok) fetchMembers();
  };

  const onSync = async () => {
    setSyncing(true);
    const slug = process.env.REACT_APP_HELLOASSO_ORGANIZATION_SLUG;
    if (slug) await handleGetHelloAssoPayments(slug);
    setSyncing(false);
  };

  const needsPassword = !editingMemberId && ADMIN_ROLES.includes(form.role);

  const startEdit = (m) => {
    setEditingMemberId(m.id);
    setForm({
      firstname: m.firstname || "",
      lastname: m.lastname || "",
      email: m.email || "",
      phone: m.phone || "",
      role: m.role || "membre",
      status: m.status || "active",
      joinDate: m.joinDate ? m.joinDate.split("T")[0] : new Date().toISOString().split("T")[0],
      isSubscribed: m.isSubscribed ?? true,
    });
    setShowModal(true);
  };

  const filteredMembers = members.filter(m => {
    const fullName = `${m.firstname || ""} ${m.lastname || ""}`.toLowerCase();
    const searchClean = searchTerm.toLowerCase().trim();
    const matchesSearch = fullName.includes(searchClean) || 
                          (m.email && m.email.toLowerCase().includes(searchClean)) ||
                          (m.memberNumber && m.memberNumber.toLowerCase().includes(searchClean));
    
    if (!matchesSearch) return false;
    
    if (roleFilter === "admin") {
      return m.role === "secretaire" || m.role === "tresorier" || m.role === "president";
    } else if (roleFilter === "member") {
      return m.role === "membre";
    }
    return true;
  });

  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredMembers.length / itemsPerPage);
  const paginatedMembers = filteredMembers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const getValidityStatus = (joinDateStr) => {
    if (!joinDateStr) return { label: "Inconnue", color: "var(--text-muted)", bg: "rgba(148,163,184,0.12)" };
    const joinDate = new Date(joinDateStr);
    const expiryDate = new Date(joinDate);
    expiryDate.setFullYear(joinDate.getFullYear() + 1);
    const now = new Date();
    
    const dateFormatted = expiryDate.toLocaleDateString("fr-FR");
    
    if (now < expiryDate) {
      return {
        label: `Valide (${dateFormatted})`,
        color: "var(--success)",
        bg: "rgba(16,185,129,0.12)"
      };
    } else {
      return {
        label: `Expiré (${dateFormatted})`,
        color: "var(--danger)",
        bg: "rgba(239,68,68,0.12)"
      };
    }
  };

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Membres de l'Association</div>
          <div className="section-subtitle">
            {searchTerm || roleFilter !== "all" ? `${filteredMembers.length} trouvé(s) sur ` : ""}{members.length} membre(s) enregistré(s)
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={onSync} disabled={syncing}>
            <RefreshCw size={14} style={{ animation: syncing ? "spin 0.8s linear infinite" : "none" }} />
            Sync HelloAsso
          </button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Nouveau membre
          </button>
        </div>
      </div>

      {/* Search & Role Filter Bar */}
      <div style={{
        background: "var(--bg-card)", border: "1px solid var(--border)",
        borderRadius: 12, padding: "12px 18px", marginBottom: 20,
        display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap"
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 260 }}>
          <Search size={18} style={{ color: "var(--text-muted)", flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Rechercher un membre par nom, email ou n° d'adhérent..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            style={{
              background: "transparent", border: "none", outline: "none",
              color: "var(--text-heading)", fontSize: "0.88rem", width: "100%"
            }}
          />
          {searchTerm && (
            <button 
              onClick={() => { setSearchTerm(""); setCurrentPage(1); }} 
              style={{ background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", fontSize: "0.85rem" }}
            >
              Vider
            </button>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <span style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>Rôle :</span>
          <select
            value={roleFilter}
            onChange={(e) => { setRoleFilter(e.target.value); setCurrentPage(1); }}
            style={{
              background: "var(--bg-body)", border: "1px solid var(--border)",
              borderRadius: 8, padding: "6px 12px", color: "var(--text-heading)",
              fontSize: "0.82rem", outline: "none", cursor: "pointer"
            }}
          >
            <option value="all">Tous les rôles</option>
            <option value="member">Membres uniquement</option>
            <option value="admin">Administrateurs uniquement</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
            Chargement…
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Membre</th>
                    <th>Email</th>
                    <th>Téléphone</th>
                    <th>N° Adhérent</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Validité</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedMembers.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                        {searchTerm ? "Aucun membre ne correspond à votre recherche." : "Aucun membre. Commencez par en ajouter un."}
                      </td>
                    </tr>
                  ) : paginatedMembers.map((m) => {
                    const val = getValidityStatus(m.joinDate);
                    return (
                      <tr key={m.id}>
                        <td>
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <div style={{
                              width: 34, height: 34, borderRadius: "50%",
                              background: "linear-gradient(135deg, #6366f1, #ec4899)",
                              display: "grid", placeItems: "center",
                              fontWeight: 700, fontSize: "0.82rem", color: "white", flexShrink: 0,
                            }}>
                              {(m.firstname?.[0] || "?") + (m.lastname?.[0] || "")}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600 }}>{m.firstname} {m.lastname}</div>
                              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                                Adhésion : {m.joinDate ? new Date(m.joinDate).toLocaleDateString("fr-FR") : "—"}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td style={{ color: "var(--text-muted)" }}>{m.email}</td>
                        <td style={{ color: "var(--text-muted)" }}>{m.phone || "—"}</td>
                        <td>
                          {m.memberNumber ? (
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 4,
                              fontSize: "0.78rem", fontFamily: "monospace",
                              color: "var(--primary)", fontWeight: 600,
                              background: "rgba(99,102,241,0.1)", padding: "2px 8px", borderRadius: 6,
                            }}>
                              <Hash size={11} /> {m.memberNumber}
                            </span>
                          ) : (
                            <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                          )}
                        </td>
                        <td>
                          <span className={ROLE_BADGE[m.role] || "badge-role badge-membre"}>
                            {ROLE_LABELS[m.role] || m.role}
                          </span>
                        </td>
                        <td>
                          <span className={`badge-role ${m.status === "active" ? "badge-status-active" : "badge-status-inactive"}`}>
                            {m.status === "active" ? "Actif" : "Inactif"}
                          </span>
                        </td>
                        <td>
                          <span style={{
                            display: "inline-flex", alignItems: "center",
                            fontSize: "0.78rem", fontWeight: 600, padding: "3px 10px",
                            borderRadius: 20, color: val.color, background: val.bg,
                          }}>
                            {val.label}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                            {ADMIN_ROLES.includes(m.role) && (
                              <span title="Peut se connecter" style={{ color: "var(--success)" }}>
                                <UserCheck size={16} />
                              </span>
                            )}
                            <button
                              className="btn-ghost"
                              style={{ padding: "4px 8px", color: "var(--primary)" }}
                              title="Modifier le membre"
                              onClick={() => startEdit(m)}
                            >
                              <Edit size={13} />
                            </button>
                            {/* Download card button if member has a number */}
                            {m.memberNumber && (
                              <button
                                className="btn-ghost"
                                style={{ padding: "4px 8px" }}
                                title="Télécharger la carte membre"
                                onClick={async () => { await downloadMemberCard(m); }}
                              >
                                <Download size={13} />
                              </button>
                            )}
                            <button className="btn-danger" onClick={() => onDelete(m.id)}>
                              <Trash2 size={13} />
                            </button>
                          </div>
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
                  Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong> ({filteredMembers.length} élément(s))
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

      {/* Create/Edit Member Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box" style={{ maxWidth: 560 }}>
            <div className="modal-header">
              <div className="modal-title">{editingMemberId ? "Modifier le Membre" : "Nouveau Membre / Utilisateur"}</div>
              <button className="modal-close" onClick={closeModal}><X size={16} /></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">

                {/* Role */}
                <div style={{ marginBottom: 20 }}>
                  <label className="form-label">Rôle</label>
                  <select className="form-select" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                    <option value="membre">Membre (sans connexion admin)</option>
                    <option value="secretaire">Secrétaire</option>
                    <option value="tresorier">Trésorier</option>
                    <option value="president">Président</option>
                  </select>
                  {needsPassword && (
                    <div style={{ marginTop: 6, padding: "6px 10px", background: "rgba(99,102,241,0.1)", borderRadius: 8, fontSize: "0.8rem", color: "var(--primary)" }}>
                      Ce rôle aura accès à l'interface d'administration.
                    </div>
                  )}
                </div>

                {/* Name */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Prénom *</label>
                    <input className="form-input" placeholder="Jean" value={form.firstname}
                      onChange={(e) => setForm({ ...form, firstname: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Nom *</label>
                    <input className="form-input" placeholder="DUPONT" value={form.lastname}
                      onChange={(e) => setForm({ ...form, lastname: e.target.value })} required />
                  </div>
                </div>

                {/* Email & Phone */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Email *</label>
                    <input type="email" className="form-input" placeholder="jean@email.fr" value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Téléphone</label>
                    <input className="form-input" placeholder="+33 6 12 34 56 78" value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>

                {/* Address */}
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Adresse</label>
                  <input className="form-input" placeholder="35 Rue Docteur Rollet, 69100 Villeurbanne" value={form.address}
                    onChange={(e) => setForm({ ...form, address: e.target.value })} />
                </div>

                {/* Profession */}
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Profession</label>
                  <input className="form-input" placeholder="Ingénieur, Médecin…" value={form.profession}
                    onChange={(e) => setForm({ ...form, profession: e.target.value })} />
                </div>

                {/* Password — admin roles only */}
                {needsPassword && (
                  <div style={{ marginBottom: 14 }}>
                    <label className="form-label">Mot de passe *</label>
                    <input type="password" className="form-input" placeholder="Min. 8 caractères" value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={8} />
                  </div>
                )}

                {/* Status — visible only in edit mode */}
                {editingMemberId && (
                  <div style={{ marginBottom: 14 }}>
                    <label className="form-label">Statut</label>
                    <select className="form-select" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                    </select>
                  </div>
                )}

                {/* Subscription info */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Date d'adhésion</label>
                    <input type="date" className="form-input" value={form.joinDate}
                      onChange={(e) => setForm({ ...form, joinDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Cotisation</label>
                    <select className="form-select" value={form.subscriptionType}
                      onChange={(e) => setForm({ ...form, subscriptionType: e.target.value })}>
                      <option value="mensuel">Mensuelle</option>
                      <option value="trimestriel">Trimestrielle</option>
                      <option value="annuel">Annuelle</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 20 }}>
                  <div>
                    <label className="form-label">Montant (€)</label>
                    <input type="number" className="form-input" placeholder="0" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Moyen de paiement</label>
                    <select className="form-select" value={form.paymentMethod}
                      onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}>
                      <option value="virement">Virement</option>
                      <option value="especes">Espèces</option>
                      <option value="carte">Carte bancaire</option>
                      <option value="cheque">Chèque</option>
                      <option value="helloasso">HelloAsso</option>
                    </select>
                  </div>
                </div>

                {/* ── Documents à générer — creation only ────────────────────── */}
                {!editingMemberId && (
                  <div style={{
                    border: "1px solid rgba(99,102,241,0.3)",
                    borderRadius: 10,
                    padding: "14px 16px",
                    background: "rgba(99,102,241,0.04)",
                  }}>
                    <div style={{ fontWeight: 600, fontSize: "0.88rem", marginBottom: 12, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                      <FileText size={15} /> Documents à générer
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                      {/* Carte membre */}
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          id="check-carte-membre"
                          checked={docs.carteMembre}
                          onChange={(e) => setDocs({ ...docs, carteMembre: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }}
                          disabled={needsPassword} // Only for regular members
                        />
                        <CreditCard size={15} style={{ color: docs.carteMembre ? "var(--primary)" : "var(--text-muted)" }} />
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>Carte de membre</div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                            Génère un N° adhérent unique · Télécharge le PDF · Envoie par email
                          </div>
                        </div>
                        {needsPassword && (
                          <span style={{ marginLeft: "auto", fontSize: "0.7rem", color: "var(--text-muted)", fontStyle: "italic" }}>
                            (membres uniquement)
                          </span>
                        )}
                      </label>

                      {/* Reçu */}
                      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
                        <input
                          type="checkbox"
                          id="check-recu"
                          checked={docs.recu}
                          onChange={(e) => setDocs({ ...docs, recu: e.target.checked })}
                          style={{ width: 16, height: 16, accentColor: "var(--primary)", cursor: "pointer" }}
                        />
                        <FileText size={15} style={{ color: docs.recu ? "var(--primary)" : "var(--text-muted)" }} />
                        <div>
                          <div style={{ fontSize: "0.88rem", fontWeight: 500 }}>
                            Reçu de cotisation
                          </div>
                          <div style={{ fontSize: "0.76rem", color: "var(--text-muted)" }}>
                            Génère un reçu de paiement officiel (Attestation de paiement)
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>
                )}

                {/* Admin password to restore session */}
                {needsPassword && (
                  <div style={{ marginTop: 14 }}>
                    <label className="form-label">Votre mot de passe (pour restaurer votre session)</label>
                    <input type="password" className="form-input" placeholder="Votre mot de passe admin" value={adminPwd}
                      onChange={(e) => setAdminPwd(e.target.value)} required={needsPassword} />
                  </div>
                )}

              </div>

              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={closeModal}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? (
                    <>
                      <span style={{ width: 14, height: 14, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", display: "inline-block", marginRight: 6 }} />
                      {savingStep || "Traitement…"}
                    </>
                  ) : (
                    <>
                      {editingMemberId ? (
                        "Enregistrer les modifications"
                      ) : (
                        <>
                          <Plus size={15} />
                          {docs.carteMembre ? "Créer & Générer carte" : "Créer le membre"}
                        </>
                      )}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; }
        .modal-box { background: var(--bg-card, #1e1e2e); border: 1px solid var(--border, rgba(255,255,255,0.08)); border-radius: 16px; width: 100%; max-width: 560px; max-height: 90vh; overflow-y: auto; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 20px 24px 0; }
        .modal-title { font-size: 1.1rem; font-weight: 700; }
        .modal-close { background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 4px; border-radius: 6px; }
        .modal-body { padding: 20px 24px; }
        .modal-footer { display: flex; justify-content: flex-end; gap: 10px; padding: 16px 24px; border-top: 1px solid var(--border, rgba(255,255,255,0.08)); }
      `}</style>
    </div>
  );
}
