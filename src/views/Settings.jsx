import React, { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { handleUpdateMember } from "../controllers/controller.member";
import { Save, User, Building2, Upload, Mail, Phone, MapPin, Globe, Facebook, Instagram, MessageCircle } from "lucide-react";
import { toast } from "react-toastify";

export default function Settings() {
  const user = useSelector((s) => s.userReducer.user);
  const dispatch = useDispatch();
  
  const [profile, setProfile] = useState({
    firstname: user?.firstname || "",
    lastname: user?.lastname || "",
    email: user?.email || "",
    phone: user?.phone || "",
    photoUrl: user?.photoUrl || "",
  });

  const [asso, setAsso] = useState(() => {
    const saved = localStorage.getItem("monasso_association_info");
    const parsed = saved ? JSON.parse(saved) : {};
    return {
      name: parsed.name || "",
      address: parsed.address || "",
      email: parsed.email || "",
      phone: parsed.phone || "",
      website: parsed.website || "",
      websiteLogin: parsed.websiteLogin || "",
      websitePassword: parsed.websitePassword || "",
      facebook: parsed.facebook || "",
      facebookLogin: parsed.facebookLogin || "",
      facebookPassword: parsed.facebookPassword || "",
      instagram: parsed.instagram || "",
      instagramLogin: parsed.instagramLogin || "",
      instagramPassword: parsed.instagramPassword || "",
      whatsapp: parsed.whatsapp || "",
      whatsappLogin: parsed.whatsappLogin || "",
      whatsappPassword: parsed.whatsappPassword || ""
    };
  });

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const updatedUser = { ...user, ...profile };
    
    // Save to database
    const success = await handleUpdateMember(user.id, updatedUser);
    
    if (success) {
      // Update global Redux state instantly
      dispatch({ type: "user-update", value: updatedUser });
    }
  };

  const handleSaveAsso = (e) => {
    e.preventDefault();
    localStorage.setItem("monasso_association_info", JSON.stringify(asso));
    toast.success("Informations de l'association sauvegardées !");
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfile({ ...profile, photoUrl: reader.result });
        toast.info("Photo prête à être sauvegardée ! (Cliquez sur Enregistrer)");
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: "20px 0" }}>
      
      {/* Profil Administrateur */}
      <div className="admin-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
          <User size={22} style={{ color: "var(--primary)" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-heading)" }}>Mon Profil Administrateur</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Gérez vos informations personnelles et votre photo de profil.</span>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} style={{ display: "grid", gridTemplateColumns: "200px 1fr", gap: 32 }}>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <div style={{ 
              width: 140, height: 140, borderRadius: "50%", background: "var(--border)", 
              border: "4px solid var(--bg-surface)", boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "center", position: "relative"
            }}>
              {profile.photoUrl ? (
                <img src={profile.photoUrl} alt="Profil" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : (
                <User size={60} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
              )}
            </div>
            
            <label className="btn-ghost" style={{ padding: "6px 14px", fontSize: "0.8rem", cursor: "pointer", position: "relative", overflow: "hidden" }}>
              <Upload size={14} style={{ marginRight: 6 }} /> Changer la photo
              <input type="file" accept="image/*" onChange={handlePhotoUpload} style={{ position: "absolute", opacity: 0, inset: 0, cursor: "pointer" }} />
            </label>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignContent: "start" }}>
            <div>
              <label className="form-label">Prénom</label>
              <input type="text" className="form-input" value={profile.firstname} onChange={e => setProfile({...profile, firstname: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Nom</label>
              <input type="text" className="form-input" value={profile.lastname} onChange={e => setProfile({...profile, lastname: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Adresse Email</label>
              <input type="email" className="form-input" value={profile.email} onChange={e => setProfile({...profile, email: e.target.value})} required />
            </div>
            <div>
              <label className="form-label">Téléphone</label>
              <input type="tel" className="form-input" value={profile.phone} onChange={e => setProfile({...profile, phone: e.target.value})} />
            </div>

            <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
              <button type="submit" className="btn-primary">
                <Save size={15} style={{ marginRight: 6 }} /> Enregistrer le profil
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Informations de l'Association */}
      <div className="admin-card" style={{ padding: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 20 }}>
          <Building2 size={22} style={{ color: "var(--success)" }} />
          <div>
            <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "var(--text-heading)" }}>Informations & Réseaux de l'Association</h3>
            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>Coordonnées officielles et liens vers vos réseaux sociaux.</span>
          </div>
        </div>

        <form onSubmit={handleSaveAsso}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
            
            {/* Colonne Contact */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-heading)", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Coordonnées Officielles</h4>
              
              <div>
                <label className="form-label"><Building2 size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)" }}/> Nom de l'Association</label>
                <input type="text" className="form-input" value={asso.name} onChange={e => setAsso({...asso, name: e.target.value})} required />
              </div>
              <div>
                <label className="form-label"><MapPin size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)" }}/> Adresse du Siège</label>
                <input type="text" className="form-input" value={asso.address} onChange={e => setAsso({...asso, address: e.target.value})} required />
              </div>
              <div style={{ display: "flex", gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <label className="form-label"><Mail size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)" }}/> Email Principal</label>
                  <input type="email" className="form-input" value={asso.email} onChange={e => setAsso({...asso, email: e.target.value})} />
                </div>
                <div style={{ flex: 1 }}>
                  <label className="form-label"><Phone size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)" }}/> Téléphone</label>
                  <input type="text" className="form-input" value={asso.phone} onChange={e => setAsso({...asso, phone: e.target.value})} />
                </div>
              </div>
            </div>

            {/* Colonne Réseaux Sociaux */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <h4 style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-heading)", borderBottom: "1px solid var(--border)", paddingBottom: 8 }}>Réseaux, Web & Accès</h4>
              
              {/* Site Web */}
              <div style={{ padding: "14px", background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <label className="form-label" style={{ fontWeight: 700, color: "var(--text-heading)" }}><Globe size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)" }}/> Site Internet</label>
                <input type="url" className="form-input" value={asso.website} onChange={e => setAsso({...asso, website: e.target.value})} placeholder="URL (ex: https://monsite.fr)" style={{ marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="text" className="form-input" value={asso.websiteLogin} onChange={e => setAsso({...asso, websiteLogin: e.target.value})} placeholder="Identifiant / Email" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                  <input type="text" className="form-input" value={asso.websitePassword} onChange={e => setAsso({...asso, websitePassword: e.target.value})} placeholder="Mot de passe" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                </div>
              </div>

              {/* Facebook */}
              <div style={{ padding: "14px", background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <label className="form-label" style={{ fontWeight: 700, color: "var(--text-heading)" }}><Facebook size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)", color: "#1877F2" }}/> Facebook</label>
                <input type="url" className="form-input" value={asso.facebook} onChange={e => setAsso({...asso, facebook: e.target.value})} placeholder="Lien de la page" style={{ marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="text" className="form-input" value={asso.facebookLogin} onChange={e => setAsso({...asso, facebookLogin: e.target.value})} placeholder="Identifiant / Email" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                  <input type="text" className="form-input" value={asso.facebookPassword} onChange={e => setAsso({...asso, facebookPassword: e.target.value})} placeholder="Mot de passe" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                </div>
              </div>

              {/* Instagram */}
              <div style={{ padding: "14px", background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <label className="form-label" style={{ fontWeight: 700, color: "var(--text-heading)" }}><Instagram size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)", color: "#E1306C" }}/> Instagram</label>
                <input type="url" className="form-input" value={asso.instagram} onChange={e => setAsso({...asso, instagram: e.target.value})} placeholder="Lien du profil" style={{ marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="text" className="form-input" value={asso.instagramLogin} onChange={e => setAsso({...asso, instagramLogin: e.target.value})} placeholder="Identifiant / Email" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                  <input type="text" className="form-input" value={asso.instagramPassword} onChange={e => setAsso({...asso, instagramPassword: e.target.value})} placeholder="Mot de passe" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                </div>
              </div>

              {/* WhatsApp */}
              <div style={{ padding: "14px", background: "rgba(0,0,0,0.02)", borderRadius: 10, border: "1px solid var(--border)" }}>
                <label className="form-label" style={{ fontWeight: 700, color: "var(--text-heading)" }}><MessageCircle size={14} style={{ display: "inline", marginRight: 4, transform: "translateY(2px)", color: "#25D366" }}/> WhatsApp</label>
                <input type="url" className="form-input" value={asso.whatsapp} onChange={e => setAsso({...asso, whatsapp: e.target.value})} placeholder="Lien du groupe / d'invitation" style={{ marginBottom: 10 }} />
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <input type="text" className="form-input" value={asso.whatsappLogin} onChange={e => setAsso({...asso, whatsappLogin: e.target.value})} placeholder="Numéro Administrateur" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                  <input type="text" className="form-input" value={asso.whatsappPassword} onChange={e => setAsso({...asso, whatsappPassword: e.target.value})} placeholder="Code PIN (optionnel)" style={{ fontSize: "0.8rem", padding: "8px 12px" }} />
                </div>
              </div>
            </div>

          </div>

          <div style={{ display: "flex", justifySpace: "between", justifyContent: "flex-end", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
            <button type="submit" className="btn-primary" style={{ background: "var(--success)" }}>
              <Save size={15} style={{ marginRight: 6 }} /> Enregistrer les infos
            </button>
          </div>
        </form>
      </div>

    </div>
  );
}
