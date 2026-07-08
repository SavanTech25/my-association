import React, { useEffect, useState } from "react";
import { Plus, X, Video, FileText, Trash2, MessageCircle, HelpCircle, Settings } from "lucide-react";
import { handleGetMeetings, handleScheduleMeeting, handleUpdateMeeting, handleDeleteMeeting } from "../controllers/controller.meeting";
import { redisCommand } from "../backend/redis";
import { toast } from "react-toastify";

const INITIAL_FORM = {
  title: "",
  date: new Date().toISOString().split("T")[0],
  time: "18:00",
  meetType: "jitsi", // "jitsi" or "manual"
  meetLink: "",
  notes: "",
  sendEmailToAdmins: true,
  shareOnWhatsapp: true,
};

export default function Secretary() {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editCR, setEditCR]     = useState(null); // { id, notes }
  const [saving, setSaving]     = useState(false);
  const [form, setForm]         = useState(INITIAL_FORM);
  
  // WhatsApp settings
  const [whatsappGroupLink, setWhatsappGroupLink] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [tempWhatsappLink, setTempWhatsappLink] = useState("");
  const [showMeetHelp, setShowMeetHelp] = useState(false);

  useEffect(() => { 
    fetchData(); 
    loadSettings();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const data = await handleGetMeetings();
    setMeetings(data);
    setLoading(false);
  };

  const loadSettings = async () => {
    try {
      const savedLink = await redisCommand(["GET", "settings:whatsapp_group_link"]);
      if (savedLink) {
        setWhatsappGroupLink(savedLink);
        setTempWhatsappLink(savedLink);
      }
    } catch (e) {
      console.error("Error loading settings:", e);
    }
  };

  const saveSettings = async (e) => {
    e.preventDefault();
    try {
      await redisCommand(["SET", "settings:whatsapp_group_link", tempWhatsappLink]);
      setWhatsappGroupLink(tempWhatsappLink);
      setShowSettings(false);
      toast.success("Lien du groupe WhatsApp enregistré !");
    } catch (e) {
      toast.error("Erreur de sauvegarde.");
    }
  };

  /**
   * Generates a beautifully formatted WhatsApp message with meeting details
   */
  const openWhatsappShare = async (m) => {
    const formattedDate = new Date(m.date).toLocaleDateString("fr-FR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
    
    const message = `🚨 *RÉUNION PLANIFIÉE* 🚨
----------------------------------------
📌 *Titre* : ${m.title}
📅 *Date* : ${formattedDate} à ${m.time}
📹 *Visioconférence* : ${m.meetLink || "Non spécifié"}
📝 *Ordre du jour* :
${m.notes || "Aucun"}
----------------------------------------
👉 *Merci d'épingler ce message dans le groupe pour que tout le monde y ait accès !* 📌`;

    // Try to copy to clipboard automatically
    try {
      await navigator.clipboard.writeText(message);
      
      // If we have a direct WhatsApp Group Invite Link, redirect directly to that group chat!
      if (whatsappGroupLink) {
        toast.success("📋 Message copié ! Redirection directe vers votre groupe WhatsApp...");
        setTimeout(() => {
          window.open(whatsappGroupLink, "_blank");
        }, 800);
        return;
      }
    } catch (err) {
      console.warn("Could not copy message to clipboard automatically:", err);
    }

    // Fallback: Open standard WhatsApp send dialog where they can select the group
    const encoded = encodeURIComponent(message);
    const url = `https://api.whatsapp.com/send?text=${encoded}`;
    window.open(url, "_blank");
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    let submitForm = { ...form };
    
    // Automatically generate Jitsi Link if selected
    if (form.meetType === "jitsi") {
      const slug = form.title
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "");
      const randomSuffix = Math.random().toString(36).substring(2, 7);
      submitForm.meetLink = `https://meet.jit.si/MonAsso-${slug || "reunion"}-${randomSuffix}`;
    }

    const result = await handleScheduleMeeting(submitForm);
    if (result.success) { 
      setShowForm(false); 
      setForm(INITIAL_FORM); 
      fetchData(); 
      
      // Auto share on WhatsApp if checked
      if (form.shareOnWhatsapp) {
        openWhatsappShare(result.meeting);
      }
    }
    setSaving(false);
  };

  const onSaveCR = async () => {
    if (!editCR) return;
    setSaving(true);
    await handleUpdateMeeting(editCR.id, { notes: editCR.notes });
    setEditCR(null);
    fetchData();
    setSaving(false);
  };

  const onDelete = async (id) => {
    await handleDeleteMeeting(id);
    fetchData();
  };

  // Is the meeting upcoming ?
  const isUpcoming = (m) => new Date(m.date) >= new Date(new Date().toDateString());

  const upcoming = meetings.filter(isUpcoming);
  const past     = meetings.filter((m) => !isUpcoming(m));

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      {/* Header */}
      <div className="section-header">
        <div>
          <div className="section-title">Secrétariat</div>
          <div className="section-subtitle">Planification des réunions et comptes rendus</div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn-ghost" onClick={() => setShowSettings(!showSettings)} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Settings size={15} /> WhatsApp
          </button>
          <button className="btn-primary" onClick={() => setShowForm(true)}>
            <Plus size={16} /> Planifier une réunion
          </button>
        </div>
      </div>

      {/* WhatsApp Link Integration Banner */}
      {showSettings && (
        <div className="admin-card" style={{ marginBottom: 20, border: "1px solid #25d366", background: "rgba(37, 211, 102, 0.03)", animation: "slideDown 0.25s ease" }}>
          <div style={{ fontWeight: 700, color: "#25d366", display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <MessageCircle size={18} /> Connecter votre Groupe WhatsApp d'Association
          </div>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginBottom: 12 }}>
            Collez le lien d'invitation de votre groupe WhatsApp ci-dessous. Cela permettra aux administrateurs de rejoindre directement le groupe ou d'y accéder en un clic depuis le tableau de bord.
          </p>
          <form onSubmit={saveSettings} style={{ display: "flex", gap: 10 }}>
            <input 
              type="url" 
              className="form-input" 
              placeholder="Ex: https://chat.whatsapp.com/GjX4L4e8q4c7..."
              value={tempWhatsappLink}
              onChange={(e) => setTempWhatsappLink(e.target.value)}
              required
              style={{ flex: 1 }}
            />
            <button type="submit" className="btn-primary" style={{ background: "#25d366", borderColor: "#25d366" }}>
              Enregistrer
            </button>
            <button type="button" className="btn-ghost" onClick={() => setShowSettings(false)}>
              Annuler
            </button>
          </form>
        </div>
      )}

      {/* WhatsApp Connected Quick Status */}
      {whatsappGroupLink && !showSettings && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(37, 211, 102, 0.06)", border: "1px solid rgba(37, 211, 102, 0.15)", borderRadius: 10, padding: "10px 16px", marginBottom: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.85rem", color: "#25d366", fontWeight: 600 }}>
            <MessageCircle size={16} /> Groupe WhatsApp de l'association connecté
          </div>
          <a href={whatsappGroupLink} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.82rem", color: "#25d366", textDecoration: "underline", fontWeight: 700 }}>
            Accéder au Groupe WhatsApp ↗
          </a>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px 0", color: "var(--text-muted)" }}>
          <div style={{ width: 28, height: 28, border: "3px solid var(--primary)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 12px" }} />
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          {/* Upcoming */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: "0.9rem", color: "var(--primary)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, background: "var(--primary)", borderRadius: "50%", display: "inline-block" }} />
              À venir ({upcoming.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {upcoming.length === 0 && (
                <div className="admin-card" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 0" }}>
                  Aucune réunion à venir.
                </div>
              )}
              {upcoming.map((m) => (
                <MeetingCard 
                  key={m.id} 
                  m={m} 
                  onCR={() => setEditCR({ id: m.id, notes: m.notes || "" })} 
                  onDelete={onDelete} 
                  onWhatsappShare={openWhatsappShare} 
                  hasWhatsappGroup={!!whatsappGroupLink}
                />
              ))}
            </div>
          </div>

          {/* Past */}
          <div>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: "0.9rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ width: 8, height: 8, background: "var(--text-muted)", borderRadius: "50%", display: "inline-block" }} />
              Passées ({past.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {past.length === 0 && (
                <div className="admin-card" style={{ textAlign: "center", color: "var(--text-muted)", padding: "30px 0" }}>
                  Aucune réunion passée.
                </div>
              )}
              {past.map((m) => (
                <MeetingCard 
                  key={m.id} 
                  m={m} 
                  past 
                  onCR={() => setEditCR({ id: m.id, notes: m.notes || "" })} 
                  onDelete={onDelete} 
                  onWhatsappShare={openWhatsappShare} 
                  hasWhatsappGroup={!!whatsappGroupLink}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Plan meeting modal */}
      {showForm && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowForm(false)}>
          <div className="modal-box" style={{ maxWidth: 500 }}>
            <div className="modal-header">
              <div className="modal-title">Planifier une réunion</div>
              <button className="modal-close" onClick={() => setShowForm(false)}><X size={16} /></button>
            </div>
            <form onSubmit={onSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label">Titre *</label>
                  <input className="form-input" placeholder="Ex: Assemblée Générale 2026" value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                  <div>
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.date}
                      onChange={(e) => setForm({ ...form, date: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Heure *</label>
                    <input type="time" className="form-input" value={form.time}
                      onChange={(e) => setForm({ ...form, time: e.target.value })} required />
                  </div>
                </div>

                {/* Meet Platform Choice */}
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span>Visioconférence *</span>
                    <button 
                      type="button" 
                      onClick={() => setShowMeetHelp(!showMeetHelp)}
                      style={{ background: "none", border: "none", color: "var(--primary)", display: "flex", alignItems: "center", gap: 4, cursor: "pointer", fontSize: "0.78rem", fontWeight: 600, padding: 0 }}
                    >
                      <HelpCircle size={13} /> Comment créer un Google Meet ?
                    </button>
                  </label>

                  {showMeetHelp && (
                    <div style={{ background: "rgba(255,255,255,0.03)", border: "1px dashed var(--border)", borderRadius: 10, padding: 12, marginBottom: 10, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: 1.4 }}>
                      <strong style={{ color: "var(--primary)" }}>Pour obtenir un lien Google Meet valide :</strong>
                      <ol style={{ paddingLeft: 16, marginTop: 6, marginBottom: 0 }}>
                        <li>Allez sur <a href="https://meet.google.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--primary)", textDecoration: "underline" }}>meet.google.com</a>.</li>
                        <li>Cliquez sur <strong>"Nouvelle réunion"</strong>.</li>
                        <li>Sélectionnez <strong>"Créer une réunion pour plus tard"</strong>.</li>
                        <li>Copiez le lien généré (ex: <code>https://meet.google.com/xxx-yyyy-zzz</code>).</li>
                        <li>Sélectionnez "Lien personnalisé" ci-dessous et collez le lien.</li>
                      </ol>
                    </div>
                  )}

                  <select 
                    className="form-input" 
                    value={form.meetType}
                    onChange={(e) => setForm({ ...form, meetType: e.target.value, meetLink: e.target.value === "jitsi" ? "" : form.meetLink })}
                    style={{ marginBottom: 10 }}
                  >
                    <option value="jitsi">📹 Salon Jitsi automatique (Gratuit, 1 clic, sans compte)</option>
                    <option value="manual">🔗 Lien Google Meet / Teams / Zoom personnalisé</option>
                  </select>

                  {form.meetType === "jitsi" && (
                    <div style={{ fontSize: "0.78rem", color: "#22c55e", fontStyle: "italic", padding: "8px 12px", background: "rgba(34, 197, 94, 0.08)", borderRadius: 8, border: "1px solid rgba(34, 197, 94, 0.15)" }}>
                      ✅ Un salon Jitsi Meet sécurisé sera généré automatiquement (Ex: meet.jit.si/MonAsso-...). Aucun compte requis !
                    </div>
                  )}

                  {form.meetType === "manual" && (
                    <input 
                      type="url" 
                      className="form-input" 
                      placeholder="Collez le lien (https://meet.google.com/...)"
                      value={form.meetLink} 
                      onChange={(e) => setForm({ ...form, meetLink: e.target.value })} 
                      required
                    />
                  )}
                </div>

                {/* Direct Communications */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14, background: "rgba(255,255,255,0.02)", padding: 12, borderRadius: 10, border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      id="send-email-admins"
                      checked={form.sendEmailToAdmins}
                      onChange={(e) => setForm({ ...form, sendEmailToAdmins: e.target.checked })}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)", cursor: "pointer" }}
                    />
                    <label htmlFor="send-email-admins" style={{ fontSize: "0.8rem", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                      📧 Inviter les admins par mail
                    </label>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      id="share-whatsapp"
                      checked={form.shareOnWhatsapp}
                      onChange={(e) => setForm({ ...form, shareOnWhatsapp: e.target.checked })}
                      style={{ width: 15, height: 15, accentColor: "var(--primary)", cursor: "pointer" }}
                    />
                    <label htmlFor="share-whatsapp" style={{ fontSize: "0.8rem", cursor: "pointer", userSelect: "none", whiteSpace: "nowrap" }}>
                      💬 Partager sur WhatsApp
                    </label>
                  </div>
                </div>

                <div>
                  <label className="form-label">Notes / Ordre du jour</label>
                  <textarea className="form-input" rows={3} placeholder="Points à aborder…"
                    value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    style={{ resize: "vertical" }} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn-ghost" onClick={() => setShowForm(false)}>Annuler</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                  {saving ? "Enregistrement…" : "Programmer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CR edit modal */}
      {editCR && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setEditCR(null)}>
          <div className="modal-box">
            <div className="modal-header">
              <div className="modal-title">Compte Rendu de Réunion</div>
              <button className="modal-close" onClick={() => setEditCR(null)}><X size={16} /></button>
            </div>
            <div className="modal-body">
              <label className="form-label">Saisir le compte rendu (CR)</label>
              <textarea className="form-input" rows={8} style={{ resize: "vertical" }}
                value={editCR.notes}
                onChange={(e) => setEditCR({ ...editCR, notes: e.target.value })}
                placeholder="Rédiger le compte rendu de la réunion…"
              />
            </div>
            <div className="modal-footer">
              <button className="btn-ghost" onClick={() => setEditCR(null)}>Annuler</button>
              <button className="btn-primary" onClick={onSaveCR} disabled={saving}>
                <FileText size={14} /> {saving ? "Sauvegarde…" : "Sauvegarder"}
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function MeetingCard({ m, onCR, onDelete, past, onWhatsappShare, hasWhatsappGroup }) {
  const isJitsi = m.meetLink && m.meetLink.includes("jit.si");
  
  return (
    <div className="admin-card" style={{ opacity: past ? 0.65 : 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: "1rem" }}>{m.title}</div>
        <button className="btn-danger" style={{ marginLeft: 8, flexShrink: 0 }} onClick={() => onDelete(m.id)}>
          <Trash2 size={13} />
        </button>
      </div>
      <div style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginBottom: 8 }}>
        📅 {new Date(m.date).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        {m.time && ` à ${m.time}`}
      </div>
      {m.meetLink && (
        <a href={m.meetLink} target="_blank" rel="noopener noreferrer"
          style={{ 
            display: "inline-flex", 
            alignItems: "center", 
            gap: 6, 
            fontSize: "0.82rem", 
            color: isJitsi ? "#22c55e" : "var(--primary)", 
            textDecoration: "none", 
            marginBottom: 8,
            fontWeight: 600
          }}
        >
          <Video size={14} /> Rejoindre {isJitsi ? "le salon Jitsi" : "le Google Meet"}
        </a>
      )}
      {m.notes && (
        <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid var(--border)", borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem", color: "var(--text-muted)", marginBottom: 10, lineHeight: 1.5, borderLeft: `3px solid ${isJitsi ? "#22c55e" : "var(--primary)"}` }}>
          {m.notes}
        </div>
      )}
      <div style={{ display: "flex", gap: 8 }}>
        <button className="btn-ghost" style={{ fontSize: "0.8rem", padding: "6px 12px" }} onClick={onCR}>
          <FileText size={13} /> {m.notes ? "Modifier le CR" : "Saisir le CR"}
        </button>
        <button 
          className="btn-whatsapp" 
          style={{ 
            fontSize: "0.8rem", 
            padding: "6px 12px", 
            background: "rgba(37, 211, 102, 0.1)", 
            color: "#25d366", 
            border: "1px solid rgba(37, 211, 102, 0.25)",
            borderRadius: 8,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            cursor: "pointer",
            transition: "all 0.2s"
          }} 
          onClick={() => onWhatsappShare(m)}
        >
          <MessageCircle size={13} /> {hasWhatsappGroup ? "Envoyer au Groupe" : "Partager WhatsApp"}
        </button>
      </div>
    </div>
  );
}
