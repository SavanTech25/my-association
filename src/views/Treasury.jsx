import React, { useEffect, useState } from "react";
import { Plus, X, TrendingUp, TrendingDown, Paperclip, FileText, Trash2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { handleGetFinances, handleAddFinance, handleGetBalance, handleDeleteFinance, handleAddExpenseReport, handleGetExpenseReports, handleUpdateExpenseReportStatus } from "../controllers/controller.finance";
import { downloadFinanceReceipt } from "../services/service.receipt";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";

const INITIAL_FORM = {
  amount: "",
  type: "income",
  date: new Date().toISOString().split("T")[0],
  method: "virement",
  motive: "",
  recipient: "",
  proof: null,
};

const INITIAL_EXPENSE_FORM = {
  title: "",
  lines: [{ label: "", amount: "" }],
  proof: null
};

const METHOD_LABELS = {
  virement: "Virement", especes: "Espèces",
  carte: "Carte bancaire", cheque: "Chèque",
};

export default function Treasury() {
  const user = useSelector((state) => state.userReducer?.user);
  const role = user?.role || "membre";
  const isAdmin = ["president", "tresorier", "secretaire"].includes(role);
  const isTreasurer = role === "tresorier" || role === "president";

  const [activeTab, setActiveTab] = useState("ledger");
  const [expenseReports, setExpenseReports] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [expenseForm, setExpenseForm] = useState(INITIAL_EXPENSE_FORM);

  const [entries, setEntries] = useState([]);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [form, setForm] = useState(INITIAL_FORM);
  const [selectedProof, setSelectedProof] = useState(null);
  const [generateInvoice, setGenerateInvoice] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    const [data, bal, reports] = await Promise.all([handleGetFinances(), handleGetBalance(), handleGetExpenseReports()]);
    setEntries(data);
    setBalance(bal);
    setExpenseReports(reports);
    setLoading(false);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (maximum 2 Mo).");
      e.target.value = null;
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        proof: {
          name: file.name,
          type: file.type,
          data: reader.result,
        },
      }));
      toast.success("Justificatif joint avec succès !");
    };
    reader.readAsDataURL(file);
  };

  const clearFile = () => {
    setForm((prev) => ({ ...prev, proof: null }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const floatAmount = parseFloat(form.amount);
    const financeData = { ...form, amount: floatAmount };
    const ok = await handleAddFinance(financeData);
    if (ok) {
      if (generateInvoice) {
        downloadFinanceReceipt({
          ...financeData,
          id: `TEMP-${Date.now().toString().slice(-6)}`
        });
      }
      setShowModal(false); 
      setForm(INITIAL_FORM); 
      setGenerateInvoice(false);
      fetchData(); 
    }
    setSaving(false);
  };

  const onDelete = (id) => {
    setConfirmModal({
      title: "Supprimer l'écriture comptable",
      message: "Êtes-vous sûr de vouloir supprimer cette écriture comptable ? Le solde de l'association sera recalculé automatiquement.",
      isDanger: true,
      onConfirm: async () => {
        setLoading(true);
        const success = await handleDeleteFinance(id);
        if (success) {
          await fetchData();
        } else {
          setLoading(false);
        }
      }
    });
  };

  const handleExpenseLineChange = (index, field, value) => {
    const newLines = [...expenseForm.lines];
    newLines[index][field] = value;
    setExpenseForm({ ...expenseForm, lines: newLines });
  };

  const addExpenseLine = () => {
    setExpenseForm({ ...expenseForm, lines: [...expenseForm.lines, { label: "", amount: "" }] });
  };

  const removeExpenseLine = (index) => {
    const newLines = expenseForm.lines.filter((_, i) => i !== index);
    setExpenseForm({ ...expenseForm, lines: newLines });
  };

  const handleExpenseFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (maximum 2 Mo).");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setExpenseForm((prev) => ({
        ...prev,
        proof: { name: file.name, type: file.type, data: reader.result },
      }));
      toast.success("Justificatif joint avec succès !");
    };
    reader.readAsDataURL(file);
  };

  const onExpenseSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    const validLines = expenseForm.lines.filter(l => l.label && l.amount);
    if (validLines.length === 0) {
      toast.error("Veuillez ajouter au moins une ligne de frais valide.");
      setSaving(false);
      return;
    }
    const totalAmount = validLines.reduce((sum, line) => sum + parseFloat(line.amount || 0), 0);
    
    const reportData = {
        title: expenseForm.title,
        lines: validLines,
        totalAmount,
        proof: expenseForm.proof,
        submitter: `${user?.firstname || ""} ${user?.lastname || ""}`.trim() || user?.email,
        date: new Date().toISOString()
    };

    const ok = await handleAddExpenseReport(reportData);
    if (ok) {
        setShowExpenseModal(false);
        setExpenseForm(INITIAL_EXPENSE_FORM);
        fetchData();
    }
    setSaving(false);
  };

  const onValidateExpense = (report, status) => {
    setConfirmModal({
      title: status === 'approved' ? "Valider la note de frais" : "Refuser la note de frais",
      message: `Êtes-vous sûr de vouloir ${status === 'approved' ? 'valider et rembourser' : 'refuser'} cette note de frais ?`,
      isDanger: status !== 'approved',
      onConfirm: async () => {
        setLoading(true);
        const success = await handleUpdateExpenseReportStatus(report.id, status);
        if (success && status === "approved") {
            await handleAddFinance({
                amount: report.totalAmount,
                type: "expense",
                date: new Date().toISOString().split("T")[0],
                method: "virement",
                motive: `Remboursement note de frais: ${report.title}`,
                recipient: report.submitter,
                proof: report.proof
            });
        }
        await fetchData();
      }
    });
  };

  const totalIncome  = entries.filter((e) => e.type === "income").reduce((s, e) => s + (e.amount || 0), 0);
  const totalExpense = entries.filter((e) => e.type === "expense").reduce((s, e) => s + (e.amount || 0), 0);

  const itemsPerPage = 10;
  const totalPages = Math.ceil(entries.length / itemsPerPage);
  const paginatedEntries = entries.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Trésorerie</div>
          <div className="section-subtitle">Gestion des entrées et sorties d'argent</div>
        </div>
        <div>
          {activeTab === "ledger" ? (
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              <Plus size={16} /> Nouvelle écriture
            </button>
          ) : (
            isAdmin && (
              <button className="btn-primary" onClick={() => setShowExpenseModal(true)}>
                <Plus size={16} /> Nouvelle note de frais
              </button>
            )
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, borderBottom: '1px solid var(--border)' }}>
          <button 
              onClick={() => setActiveTab('ledger')}
              style={{ background: 'none', border: 'none', padding: '10px 0', borderBottom: activeTab === 'ledger' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'ledger' ? 600 : 400, color: activeTab === 'ledger' ? 'var(--primary)' : 'var(--text-muted)' }}
          >
              Livre des comptes
          </button>
          <button 
              onClick={() => setActiveTab('expenses')}
              style={{ background: 'none', border: 'none', padding: '10px 0', borderBottom: activeTab === 'expenses' ? '2px solid var(--primary)' : '2px solid transparent', fontWeight: activeTab === 'expenses' ? 600 : 400, color: activeTab === 'expenses' ? 'var(--primary)' : 'var(--text-muted)' }}
          >
              Notes de frais
          </button>
      </div>

      {activeTab === "ledger" ? (
        <>
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18, marginBottom: 28 }}>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#6366f1" }} />
          <div className="stat-label">Solde Actuel</div>
          <div className="stat-value" style={{ color: balance >= 0 ? "var(--success)" : "var(--danger)" }}>
            {balance}€
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#10b981" }} />
          <div className="stat-label">Total Recettes</div>
          <div className="stat-value" style={{ color: "var(--success)" }}>
            <TrendingUp size={18} style={{ marginRight: 6, verticalAlign: "middle" }} />+{totalIncome}€
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-card-glow" style={{ background: "#ef4444" }} />
          <div className="stat-label">Total Dépenses</div>
          <div className="stat-value" style={{ color: "var(--danger)" }}>
            <TrendingDown size={18} style={{ marginRight: 6, verticalAlign: "middle" }} />-{totalExpense}€
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="admin-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
            <div style={{ width: 28, height: 28, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Motif / Destinataire</th>
                  <th>Moyen</th>
                  <th>Type</th>
                  <th>Justificatif</th>
                  <th>Montant</th>
                  <th>Solde après</th>
                  <th>Reçu ABL</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedEntries.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                      Aucune transaction. Cliquez sur "Nouvelle écriture" pour commencer.
                    </td>
                  </tr>
                ) : paginatedEntries.map((e, i) => (
                  <tr key={e.id || i}>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {new Date(e.date).toLocaleDateString("fr-FR")}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{e.motive}</div>
                      <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{e.recipient}</div>
                    </td>
                    <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                      {METHOD_LABELS[e.method] || e.method}
                    </td>
                    <td>
                      <span className={`badge-role ${e.type === "income" ? "badge-status-active" : "badge-status-inactive"}`}>
                        {e.type === "income" ? "Recette" : "Dépense"}
                      </span>
                    </td>
                    <td>
                      {e.proof ? (
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => setSelectedProof(e.proof)}
                          style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", fontSize: "0.78rem", color: "var(--primary)" }}
                        >
                          <Paperclip size={13} /> Voir
                        </button>
                      ) : (
                        <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                      )}
                    </td>
                    <td style={{ fontWeight: 700, color: e.type === "income" ? "var(--success)" : "var(--danger)" }}>
                      {e.type === "income" ? "+" : "-"}{e.amount}€
                    </td>
                    <td style={{ color: "var(--text-muted)" }}>{e.balanceAfter ?? "—"}€</td>
                    <td>
                      <button
                        type="button"
                        className="btn-ghost"
                        onClick={() => downloadFinanceReceipt(e)}
                        style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", fontSize: "0.78rem", color: "var(--success)" }}
                        title="Télécharger le reçu / la facture officielle ABL"
                      >
                        <FileText size={13} /> Reçu
                      </button>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => onDelete(e.id)}
                        style={{ padding: "6px 8px", minHeight: "auto" }}
                        title="Supprimer cette écriture"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
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
                Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong> ({entries.length} écriture(s))
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
      </>
      ) : (
        <div className="admin-card" style={{ padding: 0 }}>
          {loading ? (
             <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
               <div style={{ width: 28, height: 28, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
             </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Soumis par</th>
                    <th>Titre</th>
                    <th>Montant Total</th>
                    <th>Justificatif</th>
                    <th>Statut</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {expenseReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", color: "var(--text-muted)", padding: "40px 0" }}>
                        Aucune note de frais.
                      </td>
                    </tr>
                  ) : expenseReports.map((report) => (
                    <tr key={report.id}>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(report.createdAt).toLocaleDateString("fr-FR")}
                      </td>
                      <td style={{ fontWeight: 600 }}>{report.submitter}</td>
                      <td>
                         <div>{report.title}</div>
                         <div style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>{report.lines.length} ligne(s)</div>
                      </td>
                      <td style={{ fontWeight: 700 }}>{report.totalAmount}€</td>
                      <td>
                        {report.proof ? (
                          <button
                            type="button"
                            className="btn-ghost"
                            onClick={() => setSelectedProof(report.proof)}
                            style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 8px", fontSize: "0.78rem", color: "var(--primary)" }}
                          >
                            <Paperclip size={13} /> Voir
                          </button>
                        ) : (
                          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>—</span>
                        )}
                      </td>
                      <td>
                        {report.status === "pending" && <span className="badge-role" style={{ background: "#fef3c7", color: "#d97706" }}>En attente</span>}
                        {report.status === "approved" && <span className="badge-role" style={{ background: "#dcfce7", color: "#16a34a" }}>Validée</span>}
                        {report.status === "rejected" && <span className="badge-role" style={{ background: "#fee2e2", color: "#dc2626" }}>Refusée</span>}
                      </td>
                      <td>
                        {report.status === "pending" && isTreasurer && (
                           <div style={{ display: "flex", gap: 8 }}>
                             <button type="button" onClick={() => onValidateExpense(report, "approved")} className="btn-ghost" style={{ color: "var(--success)", padding: "6px" }} title="Valider et Rembourser">
                               <CheckCircle size={16} />
                             </button>
                             <button type="button" onClick={() => onValidateExpense(report, "rejected")} className="btn-ghost" style={{ color: "var(--danger)", padding: "6px" }} title="Refuser">
                               <XCircle size={16} />
                             </button>
                           </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">Nouvelle Écriture Comptable</div>
              <button className="modal-close" onClick={() => setShowModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Montant (€) *</label>
                    <input type="number" className="form-input" placeholder="0" value={form.amount}
                      onChange={(e) => setForm({ ...form, amount: e.target.value })} required min="0.01" step="0.01" />
                  </div>
                  <div>
                    <label className="form-label">Type *</label>
                    <select className="form-select" value={form.type}
                      onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      <option value="income">Recette (Entrée)</option>
                      <option value="expense">Dépense (Sortie)</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Moyen de paiement</label>
                    <select className="form-select" value={form.method}
                      onChange={(e) => setForm({ ...form, method: e.target.value })}>
                      <option value="virement">Virement</option>
                      <option value="especes">Espèces</option>
                      <option value="carte">Carte bancaire</option>
                      <option value="cheque">Chèque</option>
                    </select>
                  </div>
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Motif *</label>
                  <input className="form-input" placeholder="Ex: Achat matériel réunion" value={form.motive}
                    onChange={(e) => setForm({ ...form, motive: e.target.value })} required />
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Destinataire / Source *</label>
                  <input className="form-input" placeholder="Nom de l'entité" value={form.recipient}
                    onChange={(e) => setForm({ ...form, recipient: e.target.value })} required />
                </div>

                {/* Proof attachment field */}
                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14, marginTop: 14 }}>
                  <label className="form-label">Preuve / Justificatif (Optionnel)</label>
                  <input 
                    type="file" 
                    className="form-input" 
                    accept="image/*,application/pdf"
                    onChange={handleFileChange} 
                  />
                  {form.proof && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: 10, padding: "8px 12px", marginTop: 8 }}>
                      <span style={{ fontSize: "0.8rem", color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Paperclip size={14} /> {form.proof.name}
                      </span>
                      <button type="button" onClick={clearFile} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 0 }}>
                        <X size={15} />
                      </button>
                    </div>
                  )}

                  {/* Checkbox to generate receipt */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 16 }}>
                    <input 
                      type="checkbox" 
                      id="generateInvoice" 
                      checked={generateInvoice} 
                      onChange={(e) => setGenerateInvoice(e.target.checked)} 
                      style={{ width: 16, height: 16, cursor: "pointer" }}
                    />
                    <label htmlFor="generateInvoice" style={{ fontSize: "0.85rem", color: "var(--text-heading)", fontWeight: 600, cursor: "pointer" }}>
                      Générer et imprimer le reçu ABL (Sceau & Logo)
                    </label>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Expense Modal */}
      {showExpenseModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowExpenseModal(false)}>
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">Nouvelle Note de Frais</div>
              <button className="modal-close" onClick={() => setShowExpenseModal(false)}><X size={16} /></button>
            </div>
            <form onSubmit={onExpenseSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Titre de la note de frais *</label>
                  <input className="form-input" placeholder="Ex: Déplacement AG" value={expenseForm.title}
                    onChange={(e) => setExpenseForm({ ...expenseForm, title: e.target.value })} required />
                </div>
                
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                    Détail des frais
                    <button type="button" onClick={addExpenseLine} style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>
                      + Ajouter une ligne
                    </button>
                  </label>
                  {expenseForm.lines.map((line, index) => (
                    <div key={index} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'center' }}>
                      <input className="form-input" placeholder="Description (ex: Billet train)" value={line.label}
                        onChange={(e) => handleExpenseLineChange(index, 'label', e.target.value)} required style={{ flex: 1 }} />
                      <input type="number" className="form-input" placeholder="Montant (€)" value={line.amount}
                        onChange={(e) => handleExpenseLineChange(index, 'amount', e.target.value)} required min="0.01" step="0.01" style={{ width: 120 }} />
                      {expenseForm.lines.length > 1 && (
                         <button type="button" onClick={() => removeExpenseLine(index)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', padding: '4px' }}>
                           <Trash2 size={16} />
                         </button>
                      )}
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', fontWeight: 600, marginTop: 8, fontSize: '0.9rem', color: 'var(--primary)' }}>
                    Total : {expenseForm.lines.reduce((s, l) => s + parseFloat(l.amount || 0), 0).toFixed(2)}€
                  </div>
                </div>

                <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                  <label className="form-label">Preuve / Justificatif *</label>
                  <input type="file" className="form-input" accept="image/*,application/pdf" onChange={handleExpenseFileChange} required={!expenseForm.proof} />
                  {expenseForm.proof && (
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(34, 197, 94, 0.08)", border: "1px solid rgba(34, 197, 94, 0.15)", borderRadius: 10, padding: "8px 12px", marginTop: 8 }}>
                      <span style={{ fontSize: "0.8rem", color: "#22c55e", fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>
                        <Paperclip size={14} /> {expenseForm.proof.name}
                      </span>
                      <button type="button" onClick={() => setExpenseForm({...expenseForm, proof: null})} style={{ background: "none", border: "none", color: "var(--danger)", cursor: "pointer", padding: 0 }}>
                        <X size={15} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowExpenseModal(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Soumission…" : "Soumettre la note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Selected Proof Preview Modal */}
      {selectedProof && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setSelectedProof(null)}>
          <div className="modal-box" style={{ maxWidth: 600 }}>
            <div className="modal-header">
              <div className="modal-title">Justificatif de Transaction</div>
              <button className="modal-close" onClick={() => setSelectedProof(null)}><X size={16} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: "center", padding: "20px" }}>
              {selectedProof.type.startsWith("image/") ? (
                <img 
                  src={selectedProof.data} 
                  alt={selectedProof.name} 
                  style={{ width: "100%", maxHeight: "60vh", objectFit: "contain", borderRadius: 8, boxShadow: "0 4px 12px rgba(0,0,0,0.15)" }} 
                />
              ) : (
                <div style={{ padding: "30px 0" }}>
                  <FileText size={56} style={{ color: "var(--primary)", marginBottom: 16, margin: "0 auto" }} />
                  <h4 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: 8, color: "var(--text-heading)" }}>{selectedProof.name}</h4>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 20 }}>Ce document (PDF ou autre) ne peut pas être visualisé directement dans l'application.</p>
                </div>
              )}
            </div>
            <div className="modal-footer" style={{ justifyContent: "center", gap: 10 }}>
              <a href={selectedProof.data} target="_blank" rel="noopener noreferrer" className="btn-primary" style={{ display: "inline-flex", textDecoration: "none", alignItems: "center", gap: 6 }}>
                Ouvrir dans un nouvel onglet
              </a>
              <a href={selectedProof.data} download={selectedProof.name} className="btn-ghost" style={{ display: "inline-flex", textDecoration: "none", alignItems: "center", gap: 6 }}>
                Télécharger le document
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="modal-overlay" style={{ zIndex: 1100 }}>
          <div className="modal-box" style={{ maxWidth: 400, textAlign: "center", padding: "30px 24px" }}>
            <AlertTriangle size={48} style={{ color: confirmModal.isDanger ? "var(--danger)" : "var(--warning)", marginBottom: 16 }} />
            <h3 style={{ fontSize: "1.2rem", fontWeight: 700, color: "var(--text-heading)", marginBottom: 10 }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: 24, lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: "flex", gap: 12, justifyContent: "center" }}>
              <button type="button" className="btn-ghost" onClick={() => setConfirmModal(null)}>Annuler</button>
              <button type="button" className={confirmModal.isDanger ? "btn-danger" : "btn-primary"} onClick={() => { confirmModal.onConfirm(); setConfirmModal(null); }}>
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
