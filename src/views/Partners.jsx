import React, { useState } from "react";
import { Plus, Building, Link as LinkIcon, Mail, Phone, Trash2, X, User } from "lucide-react";
import { toast } from "react-toastify";

export default function Partners() {
  const [partners, setPartners] = useState([]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newPartner, setNewPartner] = useState({
    name: "", logo: "", contactName: "", email: "", phone: "", website: ""
  });

  const handleAddPartner = (e) => {
    e.preventDefault();
    if (!newPartner.name) return;
    setPartners([{ ...newPartner, id: Date.now() }, ...partners]);
    setIsModalOpen(false);
    setNewPartner({ name: "", logo: "", contactName: "", email: "", phone: "", website: "" });
    toast.success("Partenaire ajouté avec succès !");
  };

  const handleDelete = (id) => {
    setPartners(partners.filter(p => p.id !== id));
    toast.error("Partenaire retiré.");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 0" }}>
      
      {/* Header and Add Button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "var(--text-heading)" }}>Gestion des Partenaires</h2>
          <p style={{ margin: "4px 0 0 0", fontSize: "0.85rem", color: "var(--text-muted)" }}>Consultez et gérez les sponsors, mécènes et partenaires officiels de l'association.</p>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)}>
          <Plus size={16} style={{ marginRight: 6 }} /> Nouveau Partenaire
        </button>
      </div>

      {/* Grid of Partners */}
      {partners.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed var(--border)", marginTop: 10 }}>
          <Building size={40} style={{ color: "var(--text-muted)", opacity: 0.4, marginBottom: 16 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "var(--text-heading)" }}>Aucun partenaire enregistré</h3>
          <p style={{ margin: 0, fontSize: "0.85rem", color: "var(--text-muted)", maxWidth: 400, marginLeft: "auto", marginRight: "auto" }}>
            Vous n'avez pas encore ajouté de sponsors ou de partenaires. Cliquez sur "Nouveau Partenaire" pour commencer.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, marginTop: 10 }}>
          {partners.map(partner => (
            <div key={partner.id} className="admin-card" style={{ padding: 0, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
              
              <button 
                className="btn-danger" 
                style={{ position: "absolute", top: 12, right: 12, padding: 6, minHeight: "auto", borderRadius: "50%" }}
                onClick={() => handleDelete(partner.id)}
              >
                <Trash2 size={13} />
              </button>

              {/* Top banner / Logo Area */}
              <div style={{ padding: 24, background: "rgba(99, 102, 241, 0.05)", display: "flex", alignItems: "center", gap: 16, borderBottom: "1px solid var(--border)" }}>
                <div style={{ width: 64, height: 64, borderRadius: 12, background: "white", padding: 6, display: "grid", placeItems: "center", boxShadow: "0 2px 6px rgba(0,0,0,0.05)" }}>
                  {partner.logo ? (
                    <img src={partner.logo} alt={partner.name} style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                  ) : (
                    <Building size={24} style={{ color: "var(--text-muted)" }} />
                  )}
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--text-heading)" }}>{partner.name}</h3>
                  {partner.website && (
                    <a href={partner.website} target="_blank" rel="noreferrer" style={{ fontSize: "0.75rem", color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4, textDecoration: "none", marginTop: 4 }}>
                      <LinkIcon size={10} /> Visiter le site
                    </a>
                  )}
                </div>
              </div>

              {/* Contact Details */}
              <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", color: "var(--text-heading)" }}>
                  <User size={14} style={{ color: "var(--text-muted)" }} /> 
                  <span style={{ fontWeight: 600 }}>{partner.contactName || "Contact non spécifié"}</span>
                </div>
                
                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <Phone size={14} /> 
                  {partner.phone || "---"}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "0.85rem", color: "var(--text-muted)" }}>
                  <Mail size={14} /> 
                  {partner.email ? <a href={`mailto:${partner.email}`} style={{ color: "var(--text-muted)" }}>{partner.email}</a> : "---"}
                </div>

              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal / Slide Over for New Partner */}
      {isModalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", justifyContent: "flex-end", background: "rgba(0,0,0,0.4)", backdropFilter: "blur(2px)" }}>
          <div style={{ width: 400, background: "var(--bg-surface)", height: "100%", display: "flex", flexDirection: "column", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)", animation: "slideInRight 0.3s ease" }}>
            
            <div style={{ padding: 20, borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--text-heading)" }}>Ajouter un Partenaire</h3>
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)} style={{ padding: 6, minHeight: "auto" }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ padding: 20, flex: 1, overflowY: "auto" }}>
              <form id="partner-form" onSubmit={handleAddPartner} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label className="form-label">Nom de l'organisme / entreprise <span style={{ color: "var(--danger)" }}>*</span></label>
                  <input type="text" className="form-input" required value={newPartner.name} onChange={e => setNewPartner({...newPartner, name: e.target.value})} placeholder="Ex: Crédit Mutuel" />
                </div>
                <div>
                  <label className="form-label">URL du Logo (Image PNG/JPG)</label>
                  <input type="url" className="form-input" value={newPartner.logo} onChange={e => setNewPartner({...newPartner, logo: e.target.value})} placeholder="https://..." />
                </div>
                <div>
                  <label className="form-label">Site Internet</label>
                  <input type="url" className="form-input" value={newPartner.website} onChange={e => setNewPartner({...newPartner, website: e.target.value})} placeholder="https://..." />
                </div>
                
                <div style={{ height: 1, background: "var(--border)", margin: "8px 0" }} />

                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", margin: 0 }}>Informations du Contact Référent</h4>
                <div>
                  <label className="form-label">Nom du Responsable</label>
                  <input type="text" className="form-input" value={newPartner.contactName} onChange={e => setNewPartner({...newPartner, contactName: e.target.value})} placeholder="Ex: Jean Dupont" />
                </div>
                <div>
                  <label className="form-label">Email de contact</label>
                  <input type="email" className="form-input" value={newPartner.email} onChange={e => setNewPartner({...newPartner, email: e.target.value})} placeholder="contact@..." />
                </div>
                <div>
                  <label className="form-label">Téléphone</label>
                  <input type="tel" className="form-input" value={newPartner.phone} onChange={e => setNewPartner({...newPartner, phone: e.target.value})} placeholder="04 00 00 00 00" />
                </div>
              </form>
            </div>

            <div style={{ padding: 20, borderTop: "1px solid var(--border)", display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn-ghost" onClick={() => setIsModalOpen(false)}>Annuler</button>
              <button type="submit" form="partner-form" className="btn-primary">Ajouter</button>
            </div>

          </div>

          <style>{`
            @keyframes slideInRight {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
