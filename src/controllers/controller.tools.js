import { toast } from "react-toastify";

// ── LOCAL FALLBACKS ──────────────────────────────────────────────────────────
const MOCK_FLYER_TEMPLATES = [
  { 
    title: "NUIT DU FASO À LYON", 
    tagline: "Célébrons les rythmes et saveurs du pays des hommes intègres !", 
    date: "Samedi 10 Octobre 2026", 
    time: "19h00 - 02h00", 
    place: "Espace Culturel Lyon, 69003 Lyon", 
    price: "12 € en prévente / 15 € sur place",
    contact: "asso.abl.lyon@gmail.com · 06 99 88 77 66", 
    colorTheme: "galaxy", 
    flyerStyle: "glass",
    styles: {
      title: { fontSize: 24, color: "#ffffff", fontFamily: "Montserrat", fontWeight: "800", fontStyle: "normal", textTransform: "uppercase", textDecoration: "none" },
      tagline: { fontSize: 13, color: "#f3e8ff", fontFamily: "Outfit", fontWeight: "normal", fontStyle: "italic", textTransform: "none", textDecoration: "none" },
      details: { fontSize: 12, color: "#ffffff", fontFamily: "Outfit", fontWeight: "normal", fontStyle: "normal", textTransform: "none", textDecoration: "none", bgColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" },
      footer: { fontSize: 11, color: "#a855f7", fontFamily: "Outfit", fontWeight: "700", fontStyle: "normal", textTransform: "none", textDecoration: "none" }
    },
    positions: {
      logo: { x: 5, y: 4 },
      title: { x: 5, y: 16 },
      tagline: { x: 5, y: 32 },
      details: { x: 5, y: 42 },
      footer: { x: 5, y: 88 }
    }
  },
  { 
    title: "CONCERT DE FRATERNITÉ ABL", 
    tagline: "Unissant nos forces pour l'éducation au Burkina", 
    date: "Dimanche 8 Novembre 2026", 
    time: "16h00 - 20h00", 
    place: "Salle des fêtes de Vaise, 69009 Lyon", 
    price: "Entrée Libre (Don libre)",
    contact: "contact@abl-lyon.org · 06 12 34 56 78", 
    colorTheme: "sunset", 
    flyerStyle: "bold",
    styles: {
      title: { fontSize: 22, color: "#ffffff", fontFamily: "Outfit", fontWeight: "800", fontStyle: "normal", textTransform: "uppercase", textDecoration: "none" },
      tagline: { fontSize: 14, color: "#ffedd5", fontFamily: "Playfair Display", fontWeight: "normal", fontStyle: "italic", textTransform: "none", textDecoration: "none" },
      details: { fontSize: 12, color: "#ffffff", fontFamily: "Outfit", fontWeight: "normal", fontStyle: "normal", textTransform: "none", textDecoration: "none", bgColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" },
      footer: { fontSize: 11, color: "#ec4899", fontFamily: "Outfit", fontWeight: "700", fontStyle: "normal", textTransform: "none", textDecoration: "none" }
    },
    positions: {
      logo: { x: 4, y: 3 },
      title: { x: 4, y: 18 },
      tagline: { x: 4, y: 34 },
      details: { x: 4, y: 44 },
      footer: { x: 4, y: 86 }
    }
  }
];

// Helper to convert objects (e.g. nested contact/place info) into clean text strings
export function safeString(value, delimiter = " · ") {
  if (!value) return "";
  if (typeof value === "object") {
    return Object.values(value).filter(Boolean).join(delimiter);
  }
  return String(value);
}

// ── CORE SERVICE FETCHERS ───────────────────────────────────────────────────
/**
 * Calls selected AI API (Gemini, Mistral, Anthropic Claude) with text & multimodal image support
 * @param {string} provider 
 * @param {string} apiKey 
 * @param {string} prompt 
 * @param {string} systemInstructions 
 * @param {Object} envKeys 
 * @param {Array} images - array of { mimeType, base64 } objects
 * @returns {Promise<string|null>} Response text
 */
export async function runAiService(provider, apiKey, prompt, systemInstructions = "", envKeys = {}, images = []) {
  const activeKey = apiKey || (provider === "gemini" ? envKeys.gemini : provider === "mistral" ? envKeys.mistral : envKeys.claude);

  if (!activeKey) {
    console.warn(`No API Key provided for AI Provider: ${provider}`);
    return null;
  }

  try {
    if (provider === "gemini") {
      const parts = [{ text: `${systemInstructions}\n\n${prompt}` }];
      
      // Inject images for Multimodal support
      images.forEach(img => {
        parts.push({
          inlineData: {
            mimeType: img.mimeType,
            data: img.base64
          }
        });
      });

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${activeKey}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Erreur Gemini API");
      return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } 
    
    else if (provider === "mistral") {
      // Mistral Text-Only call
      const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${activeKey}`
        },
        body: JSON.stringify({
          model: "mistral-tiny",
          messages: [
            { role: "system", content: systemInstructions },
            { role: "user", content: prompt }
          ]
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Erreur Mistral API");
      return data.choices?.[0]?.message?.content || "";
    } 
    
    else if (provider === "anthropic") {
      const contentPayload = [{ type: "text", text: prompt }];

      // Inject images for Multimodal support in Claude Messages API
      images.forEach(img => {
        contentPayload.push({
          type: "image",
          source: {
            type: "base64",
            media_type: img.mimeType,
            data: img.base64
          }
        });
      });

      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": activeKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: "claude-3-5-sonnet-20241022",
          max_tokens: 1024,
          messages: [{ role: "user", content: contentPayload }],
          system: systemInstructions
        })
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error.message || "Erreur Claude API");
      return data.content?.[0]?.text || "";
    }
  } catch (err) {
    console.error(`AI API Error [${provider}]:`, err);
    toast.warning(`L'appel à l'API ${provider} a échoué. Utilisation du moteur local de secours.`);
    return null;
  }
  return null;
}

// ── LAYOUT DESIGN GENERATOR ENGINE ───────────────────────────────────────────
/**
 * Takes current inputs, sizes, colors, and user uploaded files and asks AI to return an optimized blueprint.
 * Passes images natively to Claude & Gemini for high-fidelity composition!
 * @returns {Promise<Object>} Optimized flyer configuration
 */
export async function generateFlyerAiBlueprint(provider, apiKey, currentData, floatingImages = [], logoSrc = "", bgSrc = "", envKeys = {}, rawDescription = "") {
  const imageIds = floatingImages.map(img => `image_${img.id}`);
  
  const prompt = `Voici les consignes et la description de l'événement fournie par l'utilisateur pour le flyer :
  "${rawDescription || "Générer un flyer à partir des textes ci-dessous"}"

  Considère également les textes du flyer (le cas échéant) :
  - Titre principal : "${currentData.title}"
  - Slogan publicitaire : "${currentData.tagline}"
  - Date : "${currentData.date}"
  - Heure : "${currentData.time}"
  - Lieu exact : "${currentData.place}"
  - Tarif : "${currentData.price}"
  - Contacts : "${currentData.contact}"
  
  Considère également ces ressources importées dans le montage :
  - Logo présent : ${logoSrc ? "Oui" : "Non"}
  - Image de fond présente : ${bgSrc ? "Oui" : "Non"}
  - Images flottantes à intégrer (IDs) : [${imageIds.join(", ")}] (Nombre d'images : ${imageIds.length})

  Si les modèles Gemini ou Claude sont utilisés, tu as reçu en entrée visuelle les vraies images (le logo, les images du flyer, etc.).
  Inspecte-les visuellement pour accorder la typographie et le thème de couleur aux graphismes des images téléversées !

  Ta tâche est de concevoir un layout (mise en page) et une charte typographique à couper le souffle.
  
  ⚠️ RÈGLES DE CONTRASTE & COULEUR STRICTES :
  - Les textes DOIVENT avoir un excellent contraste avec le fond. Ne génère JAMAIS de textes sombres (noir, gris foncé, bleu marine comme #000000, #1e293b, etc.) car les thèmes de fond sont sombres ou colorés.
  - Utilise des couleurs ultra-lumineuses pour faire ressortir les informations clés en fonction du thème choisi :
    * sunset : Titre blanc (#ffffff), slogan blanc (#ffffff), détails blancs (#ffffff), accents jaune brillant (#fef08a) ou or (#f59e0b).
    * galaxy : Titre blanc (#ffffff), accents cyan électrique (#2dd4bf) ou violet clair (#ddd6fe).
    * emerald : Titre blanc (#ffffff), accents menthe claire (#a7f3d0) ou cyan (#cffafe).
    * cyber : Titre blanc (#ffffff), accents cyan (#06b6d4) ou jaune fluo (#facc15).
    * classic : Titre blanc (#ffffff), accents or (#fbbf24) ou vert d'eau (#a7f3d0).

  ⚠️ RÈGLES D'AGENCEMENT & DE PLACEMENT DU GRID (Éviter tout chevauchement) :
  - Coordonnées X et Y sont en pourcentage (de 0 à 100 de l'espace canvas). Ne place AUCUN élément au-delà de 92% (pour éviter d'être tronqué).
  - Enchaînement Vertical standardisé :
    * Logo : x = 4, y = 3 à 6 (en haut à gauche).
    * Titre principal : x = 4 à 6, y = 14 à 24 (large, grand, bold, uppercase, fontSize: 24-28).
    * Slogan (Tagline) : x = 4 à 6, y = 26 à 34 (fontSize: 13-15, italic, avec ligne d'accent).
    * Zone Milieu (Double Colonne STRICTE pour équilibrer la mise en page) :
      - Colonne de gauche (Boîte de détails - Date, Lieu, Tarif) : Doit résider STRICTEMENT à x = 4 à 6, y = 38 à 74.
      - Colonne de droite (Images flottantes : [${imageIds.join(", ")}]) : DOIVENT résider STRICTEMENT à droite pour équilibrer le flyer, à x = 54 à 58. Si plusieurs images, espace-les verticalement, par exemple :
        ${imageIds.map((id, idx) => `        "${id}": { "x": 56, "y": ${38 + idx * 18} }`).join("\n")}
    * Pied de page (Footer / Contacts) : x = 4, y = 84 à 88.

  Renvoie UNIQUEMENT un objet JSON brut, sans mise en forme Markdown (pas de codeblocks, pas d'étoiles **).
  Format requis exact :
  {
    "title": "TITRE OPTIMISÉ",
    "tagline": "Slogan percutant optimisé",
    "date": "Date optimisée",
    "time": "Heure optimisée",
    "place": "Lieu optimisé (Format texte simple)",
    "price": "Tarif optimisé",
    "contact": "Contacts optimisés (Format texte simple)",
    "colorTheme": "sunset",
    "flyerStyle": "glass",
    "styles": {
      "title": { "fontSize": 24, "color": "#ffffff", "fontFamily": "Montserrat", "fontWeight": "800", "fontStyle": "normal", "textTransform": "uppercase", "textDecoration": "none" },
      "tagline": { "fontSize": 13, "color": "#ffffff", "fontFamily": "Outfit", "fontWeight": "normal", "fontStyle": "italic", "textTransform": "none", "textDecoration": "none" },
      "details": { "fontSize": 12, "color": "#ffffff", "fontFamily": "Outfit", "fontWeight": "normal", "fontStyle": "normal", "textTransform": "none", "textDecoration": "none", "bgColor": "rgba(255,255,255,0.06)", "borderColor": "rgba(255,255,255,0.12)" },
      "footer": { "fontSize": 11, "color": "#fbbf24", "fontFamily": "Outfit", "fontWeight": "700", "fontStyle": "normal", "textTransform": "none", "textDecoration": "none" }
    },
    "positions": {
      "logo": { "x": 4, "y": 3 },
      "title": { "x": 4, "y": 14 },
      "tagline": { "x": 4, "y": 28 },
      "details": { "x": 4, "y": 42 },
      "footer": { "x": 4, "y": 86 }
      ${imageIds.map(id => `,"${id}": { "x": 56, "y": 42 }`).join("")}
    }
  }`;

  // Process and extract clean base64 data for the multimodal payload
  const images = [];
  const processBase64Image = (dataUrl) => {
    if (!dataUrl || !dataUrl.startsWith("data:")) return null;
    const match = dataUrl.match(/^data:(image\/[a-zA-Z+.-]+);base64,/);
    const mimeType = match ? match[1] : "image/png";
    const commaIndex = dataUrl.indexOf(",");
    if (commaIndex === -1) return null;
    const base64 = dataUrl.substring(commaIndex + 1);
    return { mimeType, base64 };
  };

  if (logoSrc) {
    const processed = processBase64Image(logoSrc);
    if (processed) images.push(processed);
  }
  floatingImages.forEach(img => {
    if (img.src) {
      const processed = processBase64Image(img.src);
      if (processed) images.push(processed);
    }
  });
  if (bgSrc) {
    const processed = processBase64Image(bgSrc);
    if (processed) images.push(processed);
  }

  const system = "Tu es le directeur artistique et architecte d'interface principal de l'Association des Burkinabè de Lyon.";
  const result = await runAiService(provider, apiKey, prompt, system, envKeys, images);

  if (result) {
    try {
      // Clean potential JSON markdown formatting
      let cleaned = result
        .replace(/\*\*/g, "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }

      const parsed = JSON.parse(cleaned);

      // Defensively parse nested objects to strings to prevent React crash
      if (parsed.contact && typeof parsed.contact === "object") {
        parsed.contact = safeString(parsed.contact);
      }
      if (parsed.place && typeof parsed.place === "object") {
        parsed.place = safeString(parsed.place, ", ");
      }
      if (parsed.title && typeof parsed.title === "object") {
        parsed.title = safeString(parsed.title);
      }
      if (parsed.tagline && typeof parsed.tagline === "object") {
        parsed.tagline = safeString(parsed.tagline);
      }

      return parsed;
    } catch (e) {
      console.error("Layout JSON parsing failed:", e);
      toast.error("Erreur de décodage du layout de l'IA.");
      return null;
    }
  }

  // Local failsafe blueprint fallback
  const fallback = MOCK_FLYER_TEMPLATES[Math.floor(Math.random() * MOCK_FLYER_TEMPLATES.length)];
  const updatedPositions = { ...fallback.positions };
  imageIds.forEach((id, idx) => {
    updatedPositions[id] = { x: 55, y: 40 + idx * 18 };
  });
  return {
    ...fallback,
    title: safeString(currentData.title) || fallback.title,
    tagline: safeString(currentData.tagline) || fallback.tagline,
    date: safeString(currentData.date) || fallback.date,
    time: safeString(currentData.time) || fallback.time,
    place: safeString(currentData.place, ", ") || fallback.place,
    price: safeString(currentData.price) || fallback.price,
    contact: safeString(currentData.contact) || fallback.contact,
    positions: updatedPositions
  };
}

// ── SOCIAL MEDIA OPTIMIZATION SERVICE ───────────────────────────────────────
/**
 * Asks AI to optimize and structure posts for Instagram, Facebook, and WhatsApp
 * @returns {Promise<Object>} Cleaned posts for each platform
 */
export async function optimizeSocialMediaPost(provider, apiKey, inputMessage, envKeys = {}) {
  const prompt = `Voici une annonce brute d'événement associatif : "${inputMessage}".
  Réécris et optimise cette publication pour 3 plateformes : Instagram, Facebook et WhatsApp.
  
  Pour Instagram : Rends-le visuel, utilise des émoticônes au début de chaque ligne, ajoute un appel à l'action clair et une liste de 10 hashtags pertinents en français.
  Pour Facebook : Utilise un ton plus chaleureux et communautaire, structure les informations clés (Date, Lieu, Prix) sous forme de liste claire et invite au partage.
  Pour WhatsApp : Rends-le hyper concis, lisible avec des listes à puces et du formatage en gras (comme *Titre*) pour un envoi en masse.

  Renvoie le résultat sous ce format exact délimité par des balises XML :
  <instagram>Texte Instagram</instagram>
  <facebook>Texte Facebook</facebook>
  <whatsapp>Texte WhatsApp</whatsapp>`;

  const system = "Tu es un gestionnaire de réseaux sociaux professionnel et copywriter pour l'Association des Burkinabè de Lyon.";
  const result = await runAiService(provider, apiKey, prompt, system, envKeys);

  if (result) {
    const getTag = (tag) => {
      const start = result.indexOf(`<${tag}>`);
      const end = result.indexOf(`</${tag}>`);
      if (start !== -1 && end !== -1) {
        return result.substring(start + tag.length + 2, end).trim();
      }
      return "";
    };

    const ig = getTag("instagram");
    const fb = getTag("facebook");
    const wa = getTag("whatsapp");

    if (ig || fb || wa) {
      return { instagram: ig, facebook: fb, whatsapp: wa };
    }
  }

  // Local failsafe
  return {
    instagram: `⚽️🏆 GRAND TOURNOI DE SOLIDARITÉ ABL 🏆⚽️\n\nRejoignez-nous ce week-end pour partager de grands moments sportifs et solidaires !\n\n📅 Date : Ce samedi\n⏰ Horaire : Dès 14h00\n📍 Lieu : Stade de Lyon\n🎟 Inscription : 10€ par joueur\n\n👉 N'attendez plus, constituez vos équipes et inscrivez-vous directement en ligne !\n\n#ABL #Solidarite #Sport #FootLyon #BurkinabeDeLyon #Communaute #LyonSport #Entraide #Faso`,
    facebook: `📢 [ÉVÉNEMENT ABL] - Grand Tournoi de Football de Solidarité !\n\nChers membres, chers amis,\n\nL'Association des Burkinabè de Lyon (ABL) a le plaisir de vous convier à son grand tournoi de football amical et solidaire ! C'est l'occasion idéale de se retrouver dans la convivialité tout en soutenant nos futures actions de solidarité.\n\n📌 Infos Pratiques :\n• Date : Ce samedi à partir de 14h00\n• Lieu : Stade municipal de Lyon\n• PAF : 10€ / joueur\n\nVenez encourager les équipes et passer un agréable après-midi avec nous. Restauration légère et buvette burkinabè disponibles sur place 🇧🇫🍟.\n\nPartagez cette publication au maximum pour diffuser la bonne humeur ! À samedi !`,
    whatsapp: `*🏆 TOURNOI DE FOOT SOLIDAIRE ABL 🏆*\n\nL'Association des Burkinabè de Lyon vous invite au tournoi de foot de la fraternité ! ⚽️🇧🇫\n\n🗓 *Date* : Ce samedi\n⏰ *Heure* : 14h00 précises\n📍 *Lieu* : Stade de Lyon\n💵 *PAF* : 10€ par joueur\n\n*Buvette et grillades sur place !*\nVenez nombreux encourager nos joueurs ou participer !\n\n👉 _Partagez l'info dans vos groupes !_`
  };
}

// ── FLYER MANUAL MODE COPY OPTIMIZER ───────────────────────────────────────
/**
 * Takes current flyer texts and event description, and uses AI to optimize them in French.
 * Returns only the optimized texts, preserving existing styles and positions.
 */
export async function optimizeFlyerTextsAi(provider, apiKey, currentData, rawDescription = "", envKeys = {}) {
  const prompt = `Tu es l'écrivain public et le concepteur-rédacteur en chef de l'Association des Burkinabè de Lyon (ABL).
  Ta tâche est de corriger, sublimer et optimiser les textes pour notre flyer d'événement afin de les rendre extrêmement percutants, professionnels, chaleureux et sans fautes en français.

  Voici la description ou consigne de l'événement fournie par l'utilisateur :
  "${rawDescription || "Sublimer les textes du flyer"}"

  Voici les textes actuels du flyer :
  - Titre actuel : "${currentData.title || ""}"
  - Slogan actuel : "${currentData.tagline || ""}"
  - Date actuelle : "${currentData.date || ""}"
  - Heure actuelle : "${currentData.time || ""}"
  - Lieu actuel : "${currentData.place || ""}"
  - Tarif actuel : "${currentData.price || ""}"
  - Contacts actuels : "${currentData.contact || "abllyon@yahoo.fr · 06 69 18 55 67 · abl-asso.fr"}"

  Directives d'optimisation :
  1. Le titre doit être grandiose, court et accrocheur (format texte simple, maximum 45 caractères).
  2. Le slogan doit être chaleureux, inspirant et percutant (format texte simple).
  3. Corrige l'orthographe et le formatage des dates, heures et tarifs pour une clarté maximale.
  4. Intègre obligatoirement les coordonnées officielles de l'ABL si elles ne figurent pas déjà clairement dans les contacts : "abllyon@yahoo.fr · 06 69 18 55 67 · abl-asso.fr".
  5. Renseigne chaque information sous forme de texte simple.

  Renvoie UNIQUEMENT un objet JSON brut, sans mise en forme Markdown (pas de codeblocks, pas d'étoiles **).
  Format requis exact :
  {
    "title": "TITRE OPTIMISÉ",
    "tagline": "Slogan optimisé",
    "date": "Date optimisée",
    "time": "Heure optimisée",
    "place": "Lieu optimisé (Format texte simple)",
    "price": "Tarif optimisé",
    "contact": "Contacts optimisés (Format texte simple)"
  }`;

  const system = "Tu es le concepteur-rédacteur principal de l'Association des Burkinabè de Lyon.";
  const result = await runAiService(provider, apiKey, prompt, system, envKeys, []);

  if (result) {
    try {
      let cleaned = result
        .replace(/\*\*/g, "")
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        cleaned = cleaned.substring(start, end + 1);
      }
      return JSON.parse(cleaned);
    } catch (e) {
      console.error("Failed to parse optimized flyer texts:", e);
      return null;
    }
  }
  return null;
}

