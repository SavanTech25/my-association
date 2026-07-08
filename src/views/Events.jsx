import React, { useState, useEffect } from "react";
import { Plus, Calendar, Users, Image as ImageIcon, Trash2, X, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "react-toastify";

export default function Events() {
  const [events, setEvents] = useState(() => {
    const saved = localStorage.getItem("monasso_events");
    return saved ? JSON.parse(saved) : [];
  });
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: "",
    date: "",
    summary: "",
    description: "",
    participants: "",
    images: []
  });

  useEffect(() => {
    localStorage.setItem("monasso_events", JSON.stringify(events));
  }, [events]);

  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files);
    const availableSlots = 5 - newEvent.images.length;
    
    if (files.length > availableSlots) {
      toast.warning(`Vous ne pouvez ajouter que ${availableSlots} image(s) supplémentaire(s).`);
    }

    const filesToProcess = files.slice(0, availableSlots);
    
    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEvent(prev => ({
          ...prev,
          images: [...prev.images, reader.result]
        }));
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index) => {
    setNewEvent(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date || !newEvent.summary) {
      toast.error("Veuillez remplir tous les champs obligatoires (*)");
      return;
    }
    
    const eventToSave = {
      ...newEvent,
      id: Date.now().toString()
    };
    
    setEvents([eventToSave, ...events]);
    setIsModalOpen(false);
    setNewEvent({ title: "", date: "", summary: "", description: "", participants: "", images: [] });
    toast.success("Événement ajouté avec succès !");
  };

  const handleDelete = (id) => {
    if (window.confirm("Voulez-vous vraiment supprimer cet événement ?")) {
      setEvents(events.filter(ev => ev.id !== id));
      toast.info("Événement supprimé.");
    }
  };

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      <div className="section-header">
        <div>
          <div className="section-title">Événements & Activités</div>
          <div className="section-subtitle">Retrouvez les résumés et souvenirs de toutes nos activités passées.</div>
        </div>
        <button className="btn-primary" onClick={() => setIsModalOpen(true)} style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Plus size={16} /> Ajouter un événement
        </button>
      </div>

      {events.length === 0 ? (
        <div style={{ padding: "60px 20px", textAlign: "center", background: "var(--bg-card)", borderRadius: 12, border: "1px dashed var(--border)" }}>
          <Calendar size={48} style={{ color: "var(--text-muted)", opacity: 0.3, marginBottom: 16 }} />
          <h3 style={{ margin: "0 0 8px", fontSize: "1.2rem", color: "var(--text-heading)" }}>Aucun événement enregistré</h3>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--text-muted)" }}>
            Commencez par ajouter le résumé de votre première activité ou événement !
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          {events.map(ev => (
            <EventCard key={ev.id} event={ev} onDelete={() => handleDelete(ev.id)} />
          ))}
        </div>
      )}

      {/* Modal d'ajout d'événement */}
      {isModalOpen && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
          padding: 20
        }}>
          <div style={{
            background: "var(--bg-card)", borderRadius: 16, width: "100%", maxWidth: 700,
            maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 40px rgba(0,0,0,0.2)",
            animation: "slideUp 0.3s ease"
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)", position: "sticky", top: 0, background: "var(--bg-card)", zIndex: 10 }}>
              <h2 style={{ margin: 0, fontSize: "1.2rem", color: "var(--text-heading)" }}>Nouvel Événement</h2>
              <button onClick={() => setIsModalOpen(false)} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--text-muted)" }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} style={{ padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16 }}>
                <div>
                  <label className="form-label">Titre de l'événement <span style={{color: "var(--danger)"}}>*</span></label>
                  <input type="text" className="form-input" required value={newEvent.title} onChange={e => setNewEvent({...newEvent, title: e.target.value})} placeholder="Ex: Grand Tournoi de Football" />
                </div>
                <div>
                  <label className="form-label">Date <span style={{color: "var(--danger)"}}>*</span></label>
                  <input type="date" className="form-input" required value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} />
                </div>
              </div>

              <div>
                <label className="form-label">Résumé rapide <span style={{color: "var(--danger)"}}>*</span></label>
                <input type="text" className="form-input" required value={newEvent.summary} onChange={e => setNewEvent({...newEvent, summary: e.target.value})} placeholder="Une courte phrase pour résumer (ex: Belle journée sportive et conviviale...)" />
              </div>

              <div>
                <label className="form-label">Description détaillée (Optionnel)</label>
                <textarea className="form-input" style={{ minHeight: 100, resize: "vertical" }} value={newEvent.description} onChange={e => setNewEvent({...newEvent, description: e.target.value})} placeholder="Racontez comment s'est déroulé l'événement, les moments forts..." />
              </div>

              <div>
                <label className="form-label">Membres participants (Optionnel)</label>
                <input type="text" className="form-input" value={newEvent.participants} onChange={e => setNewEvent({...newEvent, participants: e.target.value})} placeholder="Ex: Jean, Marie, Equipe de foot (séparez les noms par des virgules)" />
              </div>

              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <label className="form-label" style={{ margin: 0 }}>Photos souvenirs ({newEvent.images.length}/5)</label>
                  {newEvent.images.length < 5 && (
                    <label className="btn-ghost" style={{ cursor: "pointer", fontSize: "0.8rem", padding: "4px 10px" }}>
                      <ImageIcon size={14} style={{ marginRight: 6 }} /> Ajouter Photos
                      <input type="file" multiple accept="image/*" onChange={handleImageUpload} style={{ display: "none" }} />
                    </label>
                  )}
                </div>
                {newEvent.images.length > 0 ? (
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", background: "var(--bg-body)", padding: 12, borderRadius: 8, border: "1px dashed var(--border)" }}>
                    {newEvent.images.map((img, idx) => (
                      <div key={idx} style={{ position: "relative", width: 80, height: 80, borderRadius: 8, overflow: "hidden", border: "1px solid var(--border)" }}>
                        <img src={img} alt={`Aperçu ${idx}`} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        <button type="button" onClick={() => removeImage(idx)} style={{
                          position: "absolute", top: 4, right: 4, width: 20, height: 20, borderRadius: "50%",
                          background: "rgba(239,68,68,0.9)", color: "white", border: "none",
                          display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer"
                        }}>
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ background: "rgba(0,0,0,0.02)", padding: 14, borderRadius: 8, border: "1px dashed var(--border)", fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
                    Aucune image. Cliquez sur "Ajouter Photos" pour illustrer l'événement.
                  </div>
                )}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 10, paddingTop: 20, borderTop: "1px solid var(--border)" }}>
                <button type="button" className="btn-ghost" onClick={() => setIsModalOpen(false)}>Annuler</button>
                <button type="submit" className="btn-primary">Enregistrer l'événement</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

// ── COMPONENT: Event Card with Carousel ────────────────────────────────────
const EventCard = ({ event, onDelete }) => {
  const [currentImg, setCurrentImg] = useState(0);

  const nextImg = () => {
    if (event.images && currentImg < event.images.length - 1) setCurrentImg(currentImg + 1);
  };
  
  const prevImg = () => {
    if (event.images && currentImg > 0) setCurrentImg(currentImg - 1);
  };

  return (
    <div className="admin-card" style={{ display: "flex", flexDirection: "column", overflow: "hidden", padding: 0 }}>
      {/* Header Area */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <h3 style={{ margin: 0, fontSize: "1.3rem", color: "var(--text-heading)", fontWeight: 800 }}>{event.title}</h3>
            <span style={{ fontSize: "0.75rem", padding: "4px 10px", background: "rgba(99,102,241,0.1)", color: "var(--primary)", borderRadius: 20, fontWeight: 600, display: "flex", alignItems: "center", gap: 4 }}>
              <Calendar size={12} /> {event.date}
            </span>
          </div>
          <p style={{ margin: 0, fontSize: "1rem", color: "var(--text-muted)", fontWeight: 600 }}>{event.summary}</p>
        </div>
        <button className="btn-danger" onClick={onDelete} style={{ padding: 8, minHeight: "auto", borderRadius: 8 }} title="Supprimer cet événement">
          <Trash2 size={16} />
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: event.images && event.images.length > 0 ? "1fr 1fr" : "1fr", gap: 0 }}>
        
        {/* Images Carousel Column (only shows if there are images) */}
        {event.images && event.images.length > 0 && (
          <div style={{ position: "relative", background: "#f1f5f9", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center", borderRight: "1px solid var(--border)" }}>
            <img src={event.images[currentImg]} alt={`${event.title} - ${currentImg + 1}`} style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0 }} />
            
            {event.images.length > 1 && (
              <>
                <button onClick={prevImg} disabled={currentImg === 0} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentImg === 0 ? "not-allowed" : "pointer", opacity: currentImg === 0 ? 0.5 : 1, boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
                  <ChevronLeft size={20} color="#0f172a" />
                </button>
                <button onClick={nextImg} disabled={currentImg === event.images.length - 1} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", width: 36, height: 36, borderRadius: "50%", background: "rgba(255,255,255,0.85)", border: "none", display: "flex", alignItems: "center", justifyContent: "center", cursor: currentImg === event.images.length - 1 ? "not-allowed" : "pointer", opacity: currentImg === event.images.length - 1 ? 0.5 : 1, boxShadow: "0 4px 10px rgba(0,0,0,0.15)" }}>
                  <ChevronRight size={20} color="#0f172a" />
                </button>
                <div style={{ position: "absolute", bottom: 12, left: "50%", transform: "translateX(-50%)", background: "rgba(0,0,0,0.6)", padding: "4px 12px", borderRadius: 20, color: "white", fontSize: "0.75rem", fontWeight: 700, backdropFilter: "blur(4px)" }}>
                  {currentImg + 1} / {event.images.length}
                </div>
              </>
            )}
          </div>
        )}

        {/* Info & Details Column */}
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}>
          {event.description && (
            <div>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: 1, color: "var(--primary)", display: "flex", alignItems: "center", gap: 6 }}><Info size={14} /> Description détaillée</h4>
              <p style={{ margin: 0, fontSize: "0.95rem", color: "var(--text-muted)", lineHeight: 1.6, whiteSpace: "pre-line" }}>
                {event.description}
              </p>
            </div>
          )}
          
          {event.participants && (
            <div>
              <h4 style={{ margin: "0 0 10px", fontSize: "0.85rem", textTransform: "uppercase", letterSpacing: 1, color: "var(--info)", display: "flex", alignItems: "center", gap: 6 }}><Users size={14} /> Participants à l'événement</h4>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {event.participants.split(',').filter(p => p.trim() !== '').map((p, i) => (
                  <span key={i} style={{ padding: "6px 14px", background: "rgba(6, 182, 212, 0.1)", color: "#06b6d4", borderRadius: 8, fontSize: "0.85rem", fontWeight: 600 }}>
                    {p.trim()}
                  </span>
                ))}
              </div>
            </div>
          )}
          
          {!event.description && !event.participants && (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: "0.85rem", fontStyle: "italic", background: "rgba(0,0,0,0.02)", borderRadius: 8, padding: 20, border: "1px dashed var(--border)" }}>
              Il n'y a pas de détails supplémentaires ou de participants ajoutés pour ce souvenir.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
