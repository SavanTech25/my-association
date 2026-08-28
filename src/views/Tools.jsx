import React, { useState, useEffect } from "react";
import { 
  Sparkles, FolderOpen, Share2, ClipboardType, Trash2,
  Download, Eye, Copy, Upload,
  Smartphone, Instagram, Facebook, MessageSquare, 
  Settings, Key,
  Send, Move, RefreshCcw, Plus, Bold, Italic, Type
} from "lucide-react";
import { toast } from "react-toastify";
import jsPDF from "jspdf";

// Decoupled Controller Imports
import { 
  generateFlyerAiBlueprint, 
  optimizeSocialMediaPost,
  optimizeFlyerTextsAi
} from "../controllers/controller.tools";

const getDriveEmbedUrl = (url) => {
  if (!url) return "";
  if (url.includes("embeddedfolderview")) return url;
  
  // Extract folder ID
  const folderMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
  if (folderMatch && folderMatch[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${folderMatch[1]}#grid`;
  }
  
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
  if (idMatch && idMatch[1]) {
    return `https://drive.google.com/embeddedfolderview?id=${idMatch[1]}#grid`;
  }
  
  return url;
};

export default function Tools() {
  const [activeTab, setActiveTab] = useState("flyer");

  // ── AI CONFIG STATE & ENV VARIABLES ─────────────────────────────────────────
  const envGeminiKey = process.env.REACT_APP_GEMINI_API_KEY || "";
  const envMistralKey = process.env.REACT_APP_MISTRAL_API_KEY || "";
  const envClaudeKey = process.env.REACT_APP_CLAUDE_API_KEY || process.env.REACT_APP_ANTHROPIC_API_KEY || "";

  const [aiProvider, setAiProvider] = useState(() => localStorage.getItem("abl_ai_provider") || "gemini");
  const [aiApiKey, setAiApiKey] = useState(() => {
    const saved = localStorage.getItem("abl_ai_api_key");
    if (saved) return saved;
    return aiProvider === "gemini" ? envGeminiKey : aiProvider === "mistral" ? envMistralKey : envClaudeKey;
  });
  const [isEditingKey, setIsEditingKey] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("abl_ai_api_key");
    if (!saved) {
      setAiApiKey(aiProvider === "gemini" ? envGeminiKey : aiProvider === "mistral" ? envMistralKey : envClaudeKey);
    }
  }, [aiProvider, envGeminiKey, envMistralKey, envClaudeKey]);

  const saveAiConfig = (e) => {
    e.preventDefault();
    localStorage.setItem("abl_ai_provider", aiProvider);
    localStorage.setItem("abl_ai_api_key", aiApiKey);
    setIsEditingKey(false);
    toast.success("Configuration de l'IA enregistrée !");
  };

  const handleClearApiKey = () => {
    setAiApiKey("");
    localStorage.removeItem("abl_ai_api_key");
    toast.info("Clé API supprimée.");
  };

  // Helper to retrieve current env keys
  const getEnvKeys = () => ({
    gemini: envGeminiKey,
    mistral: envMistralKey,
    claude: envClaudeKey
  });

  // ── TAB 1: FLYER GENERATOR STATE ──────────────────────────────────────────
  const [flyerData, setFlyerData] = useState({
    title: "",
    tagline: "",
    date: "",
    time: "",
    place: "",
    price: "",
    contact: "abllyon@yahoo.fr · 06 69 18 55 67 · abl-asso.fr",
    colorTheme: "classic", // sunset, galaxy, emerald, cyber, classic, custom
  });
  const [flyerStyle, setFlyerStyle] = useState("glass"); 
  const [isGeneratingFlyer, setIsGeneratingFlyer] = useState(false);
  const [flyerPrompt, setFlyerPrompt] = useState("");
  const [showManualEditor, setShowManualEditor] = useState(false);

  // AI POPUP PREVIEW STATES
  const [aiPreviewBlueprint, setAiPreviewBlueprint] = useState(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // CUSTOM PALETTE/BACKGROUND STATES
  const [customBgColor1, setCustomBgColor1] = useState("#1e3a8a");
  const [customBgColor2, setCustomBgColor2] = useState("#0d9488");

  // MULTIPLE IMAGES STATE (Up to 5 images)
  const [uploadedLogo, setUploadedLogo] = useState("");
  const [uploadedBg, setUploadedBg] = useState("");
  const [uploadedImages, setUploadedImages] = useState([]); // array of { id, src, w }

  // SELECTED ELEMENT PROPERTY CONTROLLER
  const [selectedElementId, setSelectedElementId] = useState("title"); // title, tagline, details, footer, logo or image_ID
  const [elementStyles, setElementStyles] = useState({
    title: { fontSize: 22, color: "#ffffff", fontFamily: "Outfit", fontWeight: "800", fontStyle: "normal", textTransform: "uppercase", textDecoration: "none" },
    tagline: { fontSize: 13, color: "#e2e8f0", fontFamily: "Outfit", fontWeight: "normal", fontStyle: "italic", textTransform: "none", textDecoration: "none" },
    details: { fontSize: 12, color: "#ffffff", fontFamily: "Outfit", fontWeight: "normal", fontStyle: "normal", textTransform: "none", textDecoration: "none", bgColor: "rgba(255,255,255,0.06)", borderColor: "rgba(255,255,255,0.12)" },
    footer: { fontSize: 11, color: "#10b981", fontFamily: "Outfit", fontWeight: "700", fontStyle: "normal", textTransform: "none", textDecoration: "none" },
  });

  // DRAGGABLE POSITIONS STATE (Percentages of container size)
  const [positions, setPositions] = useState({
    logo: { x: 4, y: 3 },
    title: { x: 4, y: 16 },
    tagline: { x: 4, y: 34 },
    details: { x: 4, y: 44 },
    footer: { x: 4, y: 86 }
  });

  // Defensive helpers for AI blueprint properties
  const getSafePos = (posObj, key, fallbackVal = { x: 5, y: 5 }) => {
    if (!posObj) return fallbackVal;
    const item = posObj[key];
    if (!item || typeof item.x !== "number" || typeof item.y !== "number") {
      return fallbackVal;
    }
    return item;
  };

  const getSafeStyle = (styleObj, key, property, fallbackVal = "") => {
    if (!styleObj || !styleObj[key]) return fallbackVal;
    return styleObj[key][property] !== undefined ? styleObj[key][property] : fallbackVal;
  };

  const THEME_STYLES = {
    sunset: { bg: "linear-gradient(135deg, #f59e0b, #ec4899)", accent: "#ec4899" },
    galaxy: { bg: "linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef)", accent: "#d946ef" },
    emerald: { bg: "linear-gradient(135deg, #10b981, #059669, #06b6d4)", accent: "#06b6d4" },
    cyber: { bg: "linear-gradient(135deg, #0f172a, #1e293b, #3b82f6)", accent: "#3b82f6" },
    classic: { bg: "linear-gradient(135deg, #1e3a8a, #0d9488)", accent: "#2dd4bf" },
  };

  const renderSafeString = (value, delimiter = " · ") => {
    if (!value) return "";
    if (typeof value === "object") {
      return Object.values(value).filter(Boolean).join(delimiter);
    }
    return String(value);
  };

  // Decoupled AI Layout Blueprint Call
  const handleFlyerAiRewrite = async () => {
    setIsGeneratingFlyer(true);
    
    const blueprint = await generateFlyerAiBlueprint(
      aiProvider,
      aiApiKey,
      flyerData,
      uploadedImages,
      uploadedLogo,
      uploadedBg,
      getEnvKeys(),
      flyerPrompt
    );

    if (blueprint) {
      setAiPreviewBlueprint(blueprint);
      setIsPreviewModalOpen(true);
      toast.success("Votre flyer IA a été généré ! Découvrez l'aperçu dans le popup.");
    }
    setIsGeneratingFlyer(false);
  };

  const [isOptimizingTexts, setIsOptimizingTexts] = useState(false);

  const handleFlyerTextOptimize = async () => {
    if (!aiApiKey && !envGeminiKey && !envMistralKey && !envClaudeKey) {
      toast.warning("Veuillez configurer une clé API IA d'abord !");
      return;
    }
    
    setIsOptimizingTexts(true);
    toast.info("Optimisation des textes par l'IA en cours...");
    
    const optimized = await optimizeFlyerTextsAi(
      aiProvider,
      aiApiKey,
      flyerData,
      flyerPrompt || "Optimiser et corriger les textes du flyer",
      getEnvKeys()
    );

    if (optimized) {
      setFlyerData(prev => ({
        ...prev,
        title: renderSafeString(optimized.title) || prev.title,
        tagline: renderSafeString(optimized.tagline) || prev.tagline,
        date: renderSafeString(optimized.date) || prev.date,
        time: renderSafeString(optimized.time) || prev.time,
        place: renderSafeString(optimized.place) || prev.place,
        price: renderSafeString(optimized.price) || prev.price,
        contact: renderSafeString(optimized.contact) || prev.contact
      }));
      toast.success("Vos textes de flyer ont été améliorés et polis par l'IA !");
    } else {
      toast.error("Échec de l'optimisation des textes par l'IA.");
    }
    setIsOptimizingTexts(false);
  };


  const handleApplyPreviewToWorkspace = () => {
    if (aiPreviewBlueprint) {
      setFlyerData({
        title: renderSafeString(aiPreviewBlueprint.title) || flyerData.title,
        tagline: renderSafeString(aiPreviewBlueprint.tagline) || flyerData.tagline,
        date: renderSafeString(aiPreviewBlueprint.date) || flyerData.date,
        time: renderSafeString(aiPreviewBlueprint.time) || flyerData.time,
        place: renderSafeString(aiPreviewBlueprint.place, ", ") || flyerData.place,
        price: renderSafeString(aiPreviewBlueprint.price) || flyerData.price,
        contact: renderSafeString(aiPreviewBlueprint.contact) || flyerData.contact,
        colorTheme: renderSafeString(aiPreviewBlueprint.colorTheme) || flyerData.colorTheme,
      });

      if (aiPreviewBlueprint.styles) {
        setElementStyles(prev => ({
          ...prev,
          ...aiPreviewBlueprint.styles
        }));
      }

      if (aiPreviewBlueprint.positions) {
        setPositions(prev => ({
          ...prev,
          ...aiPreviewBlueprint.positions
        }));
      }

      if (aiPreviewBlueprint.flyerStyle) {
        setFlyerStyle(aiPreviewBlueprint.flyerStyle);
      }
      
      toast.success("Le flyer IA a été appliqué à votre plan de travail !");
    }
    setIsPreviewModalOpen(false);
  };

  const handlePrintPreview = () => {
    document.body.classList.add("print-preview-active");
    window.print();
    setTimeout(() => {
      document.body.classList.remove("print-preview-active");
    }, 1000);
  };

  // Image Upload Handlers
  const handleImageUpload = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      if (type === "logo") {
        setUploadedLogo(reader.result);
        toast.success("Logo personnalisé ajouté !");
      } else if (type === "bg") {
        setUploadedBg(reader.result);
        toast.success("Image d'arrière-plan ajoutée !");
      }
    };
    reader.readAsDataURL(file);
  };

  // Up to 5 images handler
  const handleAddFloatingImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (uploadedImages.length >= 5) {
      toast.warning("Vous pouvez ajouter jusqu'à 5 images flottantes maximum.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const imgId = Date.now().toString();
      const newImg = {
        id: imgId,
        src: reader.result,
        w: 35 // default width %
      };

      setUploadedImages(prev => [...prev, newImg]);
      
      // Initialize its position on the canvas
      setPositions(prev => ({
        ...prev,
        [`image_${imgId}`]: { x: 30 + uploadedImages.length * 5, y: 35 + uploadedImages.length * 5 }
      }));

      // Select newly added image automatically
      setSelectedElementId(`image_${imgId}`);
      toast.success("Image ajoutée au flyer !");
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteFloatingImage = (id) => {
    setUploadedImages(prev => prev.filter(img => img.id !== id));
    if (selectedElementId === `image_${id}`) {
      setSelectedElementId("title");
    }
    toast.info("Image retirée.");
  };

  const handleResetImages = () => {
    setUploadedLogo("");
    setUploadedBg("");
    setUploadedImages([]);
    setSelectedElementId("title");
    toast.info("Images réinitialisées.");
  };

  // DRAG AND DROP HANDLER FOR MOUSE & TOUCH (WITH DEFAULT PREVENTION TO RESOLVE REFRESH)
  const handleDragStart = (e, elementId) => {
    e.preventDefault(); // PREVENTS BROWSER SELECTION/DRAG/NAVIGATION TRASH & PAGE REFRESH TRIGGERS!
    e.stopPropagation();
    setSelectedElementId(elementId);
    
    const container = document.getElementById("printable-flyer");
    if (!container) return;

    const startClientX = e.clientX || (e.touches && e.touches[0].clientX);
    const startClientY = e.clientY || (e.touches && e.touches[0].clientY);
    const rect = container.getBoundingClientRect();
    
    const startXPercent = ((startClientX - rect.left) / rect.width) * 100;
    const startYPercent = ((startClientY - rect.top) / rect.height) * 100;
    
    const currentPos = positions[elementId] || { x: 40, y: 40 };
    const offset = {
      x: startXPercent - currentPos.x,
      y: startYPercent - currentPos.y,
    };

    const handleDragMove = (moveEvent) => {
      moveEvent.preventDefault(); // Prevent text scrolling/zooming default
      const clientX = moveEvent.clientX || (moveEvent.touches && moveEvent.touches[0].clientX);
      const clientY = moveEvent.clientY || (moveEvent.touches && moveEvent.touches[0].clientY);
      const moveRect = container.getBoundingClientRect();
      
      const moveXPercent = ((clientX - moveRect.left) / moveRect.width) * 100;
      const moveYPercent = ((clientY - moveRect.top) / moveRect.height) * 100;
      
      let newX = Math.max(0, Math.min(90, moveXPercent - offset.x));
      let newY = Math.max(0, Math.min(94, moveYPercent - offset.y));

      setPositions(prev => ({
        ...prev,
        [elementId]: { x: Number(newX.toFixed(2)), y: Number(newY.toFixed(2)) }
      }));
    };

    const handleDragEnd = () => {
      document.removeEventListener("mousemove", handleDragMove);
      document.removeEventListener("mouseup", handleDragEnd);
      document.removeEventListener("touchmove", handleDragMove);
      document.removeEventListener("touchend", handleDragEnd);
    };

    document.addEventListener("mousemove", handleDragMove);
    document.addEventListener("mouseup", handleDragEnd);
    document.addEventListener("touchmove", handleDragMove, { passive: false });
    document.addEventListener("touchend", handleDragEnd);
  };

  const handleResetPositions = () => {
    setPositions({
      logo: { x: 4, y: 3 },
      title: { x: 4, y: 16 },
      tagline: { x: 4, y: 34 },
      details: { x: 4, y: 44 },
      footer: { x: 4, y: 86 }
    });
    toast.info("Positions réinitialisées.");
  };

  // TEXT CONTROL STYLE CHANGER UTILS
  const updateStyleAttribute = (attribute, value) => {
    if (selectedElementId.startsWith("image_")) return; // Images don't support text styles

    setElementStyles(prev => ({
      ...prev,
      [selectedElementId]: {
        ...prev[selectedElementId],
        [attribute]: value
      }
    }));
  };


  const downloadFlyerAsImage = (
    overrideData = null,
    overrideStyles = null,
    overridePositions = null
  ) => {
    const data = overrideData || flyerData;
    const styles = overrideStyles || elementStyles;
    const pos = overridePositions || positions;

    try {
      const canvas = document.createElement("canvas");
      const w = 800;
      const h = 1130;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      // Draw Background
      if (uploadedBg) {
        const bgImg = new Image();
        bgImg.src = uploadedBg;
        bgImg.onload = () => {
          ctx.drawImage(bgImg, 0, 0, w, h);
          drawTextAndLayers();
        };
      } else {
        let grad;
        if (data.colorTheme === "sunset") {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "#f59e0b");
          grad.addColorStop(1, "#ec4899");
        } else if (data.colorTheme === "galaxy") {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "#6366f1");
          grad.addColorStop(1, "#8b5cf6");
          grad.addColorStop(2, "#d946ef");
        } else if (data.colorTheme === "emerald") {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "#10b981");
          grad.addColorStop(1, "#059669");
        } else if (data.colorTheme === "cyber") {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "#0f172a");
          grad.addColorStop(1, "#1e293b");
        } else if (data.colorTheme === "custom") {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, customBgColor1);
          grad.addColorStop(1, customBgColor2);
        } else {
          grad = ctx.createLinearGradient(0, 0, 0, h);
          grad.addColorStop(0, "#1e3a8a");
          grad.addColorStop(1, "#0d9488");
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        drawTextAndLayers();
      }

      function drawTextAndLayers() {
        // Decorate background details if not custom/uploaded image
        if (!uploadedBg && data.colorTheme !== "custom") {
          ctx.fillStyle = data.colorTheme === "sunset" ? "#ec4899" : data.colorTheme === "galaxy" ? "#d946ef" : data.colorTheme === "emerald" ? "#06b6d4" : "#2dd4bf";
          ctx.globalAlpha = 0.25;
          ctx.beginPath();
          ctx.arc(w - 100, 100, 200, 0, Math.PI * 2);
          ctx.fill();
          ctx.globalAlpha = 1.0;
        }

        // Draw Logo
        if (uploadedLogo) {
          const logoImg = new Image();
          logoImg.src = uploadedLogo;
          logoImg.onload = () => {
            const logoPos = pos.logo || { x: 4, y: 3 };
            const lX = (logoPos.x / 100) * w;
            const lY = (logoPos.y / 100) * h;
            ctx.drawImage(logoImg, lX, lY, 90, 42);
            drawTitle();
          };
        } else {
          const logoPos = pos.logo || { x: 4, y: 3 };
          const lX = (logoPos.x / 100) * w;
          const lY = (logoPos.y / 100) * h;
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.beginPath();
          ctx.arc(lX + 15, lY + 15, 15, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = "#ffffff";
          ctx.font = "bold 14px Outfit";
          ctx.textAlign = "center";
          ctx.fillText("B", lX + 15, lY + 20);
          ctx.textAlign = "left";
          ctx.font = "bold 12px Outfit";
          ctx.fillText("ABL LYON", lX + 38, lY + 20);
          drawTitle();
        }
      }

      function drawTitle() {
        const tPos = pos.title || { x: 4, y: 16 };
        const tStyle = styles.title || { fontSize: 22, color: "#ffffff", fontFamily: "Outfit", fontWeight: "800" };
        ctx.fillStyle = tStyle.color || "#ffffff";
        ctx.font = `${tStyle.fontWeight === "800" ? "900" : "normal"} ${tStyle.fontSize * 1.5}px ${tStyle.fontFamily || "Outfit"}`;
        ctx.textAlign = "left";
        
        const titleText = tStyle.textTransform === "uppercase" ? data.title.toUpperCase() : data.title;
        const words = titleText.split(" ");
        let line = "";
        let y = (tPos.y / 100) * h;
        const lineH = tStyle.fontSize * 1.8;
        for(let i=0; i<words.length; i++) {
          let testLine = line + words[i] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > (w * 0.9) && i > 0) {
            ctx.fillText(line, (tPos.x / 100) * w, y);
            line = words[i] + " ";
            y += lineH;
          } else {
            line = testLine;
          }
        }
        ctx.fillText(line, (tPos.x / 100) * w, y);

        drawTagline(y + 20);
      }

      function drawTagline(calculatedY) {
        const tgPos = pos.tagline || { x: 4, y: 34 };
        const tgStyle = styles.tagline || { fontSize: 13, color: "#e2e8f0", fontFamily: "Outfit", fontStyle: "italic" };
        ctx.fillStyle = tgStyle.color || "#e2e8f0";
        ctx.font = `${tgStyle.fontStyle === "italic" ? "italic" : "normal"} ${tgStyle.fontSize * 1.4}px ${tgStyle.fontFamily || "Outfit"}`;
        ctx.textAlign = "left";

        const taglineText = data.tagline;
        ctx.fillText(taglineText, (tgPos.x / 100) * w, (tgPos.y / 100) * h);
        
        drawDetailsCard();
      }

      function drawDetailsCard() {
        const dPos = pos.details || { x: 4, y: 44 };
        const dStyle = styles.details || { fontSize: 12, color: "#ffffff", fontFamily: "Outfit" };
        const dX = (dPos.x / 100) * w;
        const dY = (dPos.y / 100) * h;
        const boxW = w * 0.44;
        const boxH = h * 0.35;

        // Card Glassmorphism Effect
        ctx.fillStyle = "rgba(15, 23, 42, 0.78)";
        ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
        ctx.lineWidth = 1.5;
        
        ctx.beginPath();
        if (ctx.roundRect) {
          ctx.roundRect(dX, dY, boxW, boxH, 16);
        } else {
          ctx.rect(dX, dY, boxW, boxH);
        }
        ctx.fill();
        ctx.stroke();

        // Inner Content
        ctx.textAlign = "left";
        
        // Date Block
        ctx.fillStyle = "#a855f7";
        ctx.font = "bold 11px Outfit";
        ctx.fillText("DATE ET HEURE", dX + 16, dY + 30);
        ctx.fillStyle = dStyle.color || "#ffffff";
        ctx.font = `bold ${dStyle.fontSize * 1.3}px ${dStyle.fontFamily || "Outfit"}`;
        ctx.fillText(data.date, dX + 16, dY + 54);
        ctx.font = `normal ${dStyle.fontSize * 1.15}px ${dStyle.fontFamily || "Outfit"}`;
        ctx.fillText(data.time, dX + 16, dY + 76);

        // Place Block
        ctx.fillStyle = "#a855f7";
        ctx.font = "bold 11px Outfit";
        ctx.fillText("LIEU DE L'ÉVÉNEMENT", dX + 16, dY + 120);
        ctx.fillStyle = dStyle.color || "#ffffff";
        ctx.font = `normal ${dStyle.fontSize * 1.15}px ${dStyle.fontFamily || "Outfit"}`;
        
        const placeLines = [];
        const pWords = data.place.split(" ");
        let pLine = "";
        for(let i=0; i<pWords.length; i++) {
          let testLine = pLine + pWords[i] + " ";
          let metrics = ctx.measureText(testLine);
          if (metrics.width > (boxW - 32) && i > 0) {
            placeLines.push(pLine);
            pLine = pWords[i] + " ";
          } else {
            pLine = testLine;
          }
        }
        placeLines.push(pLine);
        placeLines.forEach((l, idx) => {
          ctx.fillText(l, dX + 16, dY + 144 + (idx * 20));
        });

        // Price Block
        ctx.fillStyle = "#a855f7";
        ctx.font = "bold 11px Outfit";
        ctx.fillText("TARIF / ENTRÉE", dX + 16, dY + 225);
        ctx.fillStyle = "#10b981";
        ctx.font = `bold ${dStyle.fontSize * 1.3}px ${dStyle.fontFamily || "Outfit"}`;
        ctx.fillText(data.price, dX + 16, dY + 248);

        drawFooterAndIllustrations();
      }

      function drawFooterAndIllustrations() {
        // Draw Footer Contact Info
        const fPos = pos.footer || { x: 4, y: 86 };
        const fStyle = styles.footer || { fontSize: 11, color: "#10b981", fontFamily: "Outfit" };
        ctx.fillStyle = fStyle.color || "#10b981";
        ctx.font = `bold ${fStyle.fontSize * 1.4}px ${fStyle.fontFamily || "Outfit"}`;
        ctx.textAlign = "left";
        ctx.fillText(`RÉSERVATIONS : ${data.contact}`, (fPos.x / 100) * w, (fPos.y / 100) * h);

        // Draw multiple floating images (illustrations)
        let loadedCount = 0;
        if (uploadedImages.length === 0) {
          savePng();
        } else {
          uploadedImages.forEach(img => {
            const imgObj = new Image();
            imgObj.src = img.src;
            imgObj.onload = () => {
              const imgPos = pos[`image_${img.id}`] || { x: 55, y: 44 };
              const imgX = (imgPos.x / 100) * w;
              const imgY = (imgPos.y / 100) * h;
              const imgW = (img.w / 100) * w;
              const imgH = imgW; // aspect ratio square
              
              ctx.shadowColor = "rgba(0,0,0,0.5)";
              ctx.shadowBlur = 15;
              ctx.drawImage(imgObj, imgX, imgY, imgW, imgH);
              ctx.shadowColor = "transparent";
              ctx.shadowBlur = 0;

              loadedCount++;
              if (loadedCount === uploadedImages.length) {
                savePng();
              }
            };
            imgObj.onerror = () => {
              loadedCount++;
              if (loadedCount === uploadedImages.length) {
                savePng();
              }
            };
          });
        }
      }

      function savePng() {
        const link = document.createElement("a");
        link.download = `Flyer_${data.title.replace(/\s+/g, "_")}.png`;
        link.href = canvas.toDataURL("image/png");
        link.click();
        toast.success("Flyer exporté en image PNG avec succès !");
      }

    } catch (err) {
      console.error("Canvas export failed", err);
      toast.error("Erreur lors de l'exportation de l'image.");
    }
  };

  const getActiveStyle = () => {
    return elementStyles[selectedElementId] || {};
  };

  const downloadFlyerPdf = (
    overrideData = null,
    overrideStyles = null,
    overridePositions = null
  ) => {
    const data = overrideData || flyerData;
    const styles = overrideStyles || elementStyles;
    const pos = overridePositions || positions;

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const wMm = 210;
      const hMm = 297;
      
      // Background render
      if (uploadedBg) {
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, wMm, hMm, "F");
      } else if (data.colorTheme === "custom") {
        doc.setFillColor(30, 41, 59);
        doc.rect(0, 0, wMm, hMm, "F");
      } else {
        if (data.colorTheme === "sunset") doc.setFillColor(245, 158, 11);
        else if (data.colorTheme === "galaxy") doc.setFillColor(99, 102, 241);
        else if (data.colorTheme === "emerald") doc.setFillColor(16, 185, 129);
        else doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, wMm, hMm, "F");
      }

      // Title
      const tPos = pos.title;
      const tStyle = styles.title;
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", tStyle.fontWeight === "800" ? "bold" : "normal");
      doc.setFontSize(tStyle.fontSize);
      const titleLines = doc.splitTextToSize(data.title, 180);
      doc.text(titleLines, (tPos.x / 100) * wMm, ((tPos.y + 4) / 100) * hMm);

      // Tagline
      const tgPos = pos.tagline;
      const tgStyle = styles.tagline;
      doc.setTextColor(200, 200, 200);
      doc.setFont("helvetica", tgStyle.fontStyle === "italic" ? "italic" : "normal");
      doc.setFontSize(tgStyle.fontSize);
      const tgLines = doc.splitTextToSize(data.tagline, 180);
      doc.text(tgLines, (tgPos.x / 100) * wMm, ((tgPos.y + 3) / 100) * hMm);

      // Details Box
      const dPos = pos.details;
      const dStyle = styles.details;
      const dX = (dPos.x / 100) * wMm;
      const dY = (dPos.y / 100) * hMm;
      
      doc.setFillColor(30, 41, 59);
      doc.rect(dX, dY, 85, 95, "F");
      
      doc.setTextColor(255, 255, 255);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(dStyle.fontSize);
      doc.text("DATE ET HEURE :", dX + 5, dY + 12);
      doc.setFont("helvetica", "normal");
      doc.text(`${data.date}\n${data.time}`, dX + 5, dY + 20);

      doc.setFont("helvetica", "bold");
      doc.text("LIEU DE L'ÉVÉNEMENT :", dX + 5, dY + 42);
      doc.setFont("helvetica", "normal");
      const placeLines = doc.splitTextToSize(data.place, 75);
      doc.text(placeLines, dX + 5, dY + 50);

      doc.setFont("helvetica", "bold");
      doc.text("TARIF / PARTICIPATION :", dX + 5, dY + 75);
      doc.setFont("helvetica", "normal");
      doc.text(data.price, dX + 5, dY + 83);

      // Footer
      const fPos = pos.footer;
      const fStyle = styles.footer;
      doc.setTextColor(16, 185, 129);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(fStyle.fontSize);
      doc.text(`Contacts Réservations : ${data.contact}`, (fPos.x / 100) * wMm, ((fPos.y + 4) / 100) * hMm);

      // Floating Images
      uploadedImages.forEach(img => {
        const imgPos = pos[`image_${img.id}`];
        if (imgPos) {
          const imgX = (imgPos.x / 100) * wMm;
          const imgY = (imgPos.y / 100) * hMm;
          const imgW = (img.w / 100) * wMm;
          const imgH = imgW; 
          try {
            doc.addImage(img.src, "PNG", imgX, imgY, imgW, imgH);
          } catch (err) {
            console.error("PDF addImage failed", err);
          }
        }
      });

      doc.save(`Flyer_${data.title.replace(/\s+/g, "_")}.pdf`);
      toast.success("Flyer exporté en PDF avec succès !");
    } catch (e) {
      console.error("PDF Generate Error", e);
      toast.error("Erreur lors de la génération du PDF.");
    }
  };

  // ── TAB 2: DRIVE EXPLORER STATE ───────────────────────────────────────────
  const [driveFiles, setDriveFiles] = useState(() => {
    const saved = localStorage.getItem("abl_drive_files");
    return saved ? JSON.parse(saved) : [];
  });
  const [driveEmbedUrl, setDriveEmbedUrl] = useState(() => 
    localStorage.getItem("abl_drive_embed") || 
    process.env.REACT_APP_DRIVE_EMBED_URL || 
    ""
  );
  const [isEditingEmbed, setIsEditingEmbed] = useState(false);
  const [selectedDriveFile, setSelectedDriveFile] = useState(null);

  const googleApiKey = process.env.REACT_APP_GOOGLE_API_KEY || "";

  const getFolderIdFromUrl = (url) => {
    if (!url) return "";
    const folderMatch = url.match(/\/folders\/([a-zA-Z0-9-_]+)/);
    if (folderMatch && folderMatch[1]) return folderMatch[1];
    const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
    if (idMatch && idMatch[1]) return idMatch[1];
    return "";
  };

  useEffect(() => {
    localStorage.setItem("abl_drive_files", JSON.stringify(driveFiles));
  }, [driveFiles]);

  // Fetch Google Drive Files dynamically if API key is provided, or load premium ABL documents
  useEffect(() => {
    const folderId = getFolderIdFromUrl(driveEmbedUrl);

    if (!folderId || !googleApiKey) {
      if (driveFiles.length === 0) {
        setDriveFiles([]);
      }
      return;
    }

    fetch(`https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,createdTime)&key=${googleApiKey}`)
      .then(res => res.json())
      .then(data => {
        if (data.files) {
          const formatted = data.files.map(f => {
            let type = "other";
            if (f.mimeType.includes("pdf")) type = "pdf";
            else if (f.mimeType.includes("spreadsheet") || f.mimeType.includes("excel")) type = "sheet";
            else if (f.mimeType.includes("word") || f.mimeType.includes("document")) type = "word";
            else if (f.mimeType.includes("image")) type = "image";
            else if (f.mimeType.includes("folder")) type = "folder";
            
            return {
              id: f.id,
              name: f.name,
              size: f.size ? `${(parseInt(f.size) / (1024 * 1024)).toFixed(1)} MB` : "Fichier Drive",
              date: f.createdTime ? f.createdTime.split("T")[0] : new Date().toISOString().split("T")[0],
              type: type,
              mimeType: f.mimeType
            };
          });
          setDriveFiles(formatted);
        }
      })
      .catch(err => {
        console.error("Google Drive API Error:", err);
      })
      // eslint-disable-next-line
  }, [driveEmbedUrl, googleApiKey]);

  const handleSaveEmbedUrl = (e) => {
    e.preventDefault();
    localStorage.setItem("abl_drive_embed", driveEmbedUrl);
    setIsEditingEmbed(false);
    setSelectedDriveFile(null); // Reset preview
    toast.success("Dossier Google Drive connecté !");
  };

  // ── TAB 3: SOCIAL MEDIA STATE ─────────────────────────────────────────────
  const [socialInput, setSocialInput] = useState(
    "Participez à notre grand tournoi de football de solidarité ABL ce samedi à partir de 14h au stade de Lyon. Inscription à 10 euros par joueur. Venez nombreux !"
  );
  const [socialOutputs, setSocialOutputs] = useState({
    instagram: "",
    facebook: "",
    whatsapp: "",
  });
  const [socialPreviewPlatform, setSocialPreviewPlatform] = useState("instagram");
  const [isReviewingSocial, setIsReviewingSocial] = useState(false);

  // Decoupled AI Social Review Call
  const handleSocialAiReview = async () => {
    setIsReviewingSocial(true);
    
    const outputs = await optimizeSocialMediaPost(aiProvider, aiApiKey, socialInput, getEnvKeys());
    if (outputs) {
      setSocialOutputs(outputs);
      toast.success("Publication optimisée pour tous les réseaux !");
    }
    setIsReviewingSocial(false);
  };

  const handleCopyText = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papiers !");
  };

  const handleShareWhatsapp = (text) => {
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank");
  };

  return (
    <div style={{ animation: "slideUp 0.35s ease" }}>
      {/* Dynamic Font imports */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400;1,700&family=Inter:wght@300;400;600;800&family=Montserrat:wght@300;400;700;900&family=Outfit:wght@300;400;700;900&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Special+Elite&display=swap');
      `}</style>

      {/* ── Page Header ──────────────────────────────────────────────────── */}
      <div className="section-header">
        <div>
          <div className="section-title">Boîte à Outils Communication</div>
          <div className="section-subtitle">
            Générez des flyers, révisez vos publications avec l'IA et gérez vos documents associatifs.
          </div>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <button 
            className={`btn-ghost ${isEditingKey ? "active" : ""}`} 
            onClick={() => setIsEditingKey(!isEditingKey)}
            style={{ display: "flex", alignItems: "center", gap: 6 }}
          >
            <Settings size={14} /> Configurer l'IA
          </button>
        </div>
      </div>

      {/* ── AI CONFIG BLOCK ──────────────────────────────────────────────── */}
      {isEditingKey && (
        <div className="admin-card" style={{ marginBottom: 24, border: "1px solid var(--primary)" }}>
          <h3 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: 12, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 6 }}>
            <Key size={16} style={{ color: "var(--primary)" }} /> Configuration de l'IA (Gemini, Mistral ou Claude)
          </h3>
          <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginBottom: 16 }}>
            Collez votre clé API pour activer la génération en direct.
            Les variables d'environnement <code>.env</code> (<code>REACT_APP_GEMINI_API_KEY</code>, <code>REACT_APP_MISTRAL_API_KEY</code> et <code>REACT_APP_CLAUDE_API_KEY</code>) sont automatiquement détectées si elles sont présentes !
          </p>
          <form onSubmit={saveAiConfig} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 14, alignItems: "end" }}>
            <div>
              <label className="form-label">Fournisseur d'IA</label>
              <select className="form-select" value={aiProvider} onChange={(e) => setAiProvider(e.target.value)}>
                <option value="gemini">Google Gemini AI</option>
                <option value="mistral">Mistral AI</option>
                <option value="anthropic">Anthropic Claude 3.5</option>
              </select>
            </div>
            <div>
              <label className="form-label">Clé API</label>
              <input 
                type="password" 
                className="form-input" 
                placeholder={aiApiKey ? "•••••••••••••••• (Clé API Configurée)" : "Collez votre clé ici (ou configurée via .env)..."} 
                value={aiApiKey} 
                onChange={(e) => setAiApiKey(e.target.value)} 
              />
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button type="submit" className="btn-primary" style={{ padding: "10px 16px" }}>Enregistrer</button>
              {aiApiKey && <button type="button" className="btn-danger" onClick={handleClearApiKey}>Effacer</button>}
            </div>
          </form>
        </div>
      )}

      {/* ── Navigation Tabs ─────────────────────────────────────────────── */}
      <div style={{
        display: "flex", borderBottom: "1px solid var(--border)",
        marginBottom: 24, gap: 18, overflowX: "auto"
      }}>
        {[
          { id: "flyer", label: "Générateur de Flyer", icon: Sparkles },
          { id: "drive", label: "Drive ABL & Fichiers", icon: FolderOpen },
          { id: "social", label: "Publications IA & Réseaux", icon: Share2 },
          { id: "forms", label: "Formulaires Libres", icon: ClipboardType },
        ].map(tab => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                background: "transparent", border: "none", outline: "none",
                color: active ? "var(--primary)" : "var(--text-muted)",
                fontWeight: active ? 700 : 500, fontSize: "0.92rem",
                padding: "10px 4px", cursor: "pointer", display: "flex",
                alignItems: "center", gap: 8, position: "relative",
                borderBottom: active ? "2px solid var(--primary)" : "2px solid transparent",
                transition: "all 0.2s"
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── TAB CONTENT ─────────────────────────────────────────────────── */}
      <div style={{ animation: "fadeIn 0.3s ease" }}>

        {/* ── TAB 1: FLYER AI GENERATOR ──────────────────────────────────── */}
        {activeTab === "flyer" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Top Toggle Banner */}
            <div 
              className="admin-card"
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "linear-gradient(135deg, rgba(30, 41, 59, 0.7), rgba(15, 23, 42, 0.8))",
                border: "1px solid rgba(255, 255, 255, 0.08)",
                padding: "16px 24px",
                borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.2)",
                backdropFilter: "blur(12px)",
                marginBottom: 10
              }}
            >
              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, margin: 0, background: "linear-gradient(90deg, #10b981, #06b6d4, #6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                  ✨ Générateur de Flyer Intelligent
                </h3>
                <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: "4px 0 0 0" }}>
                  {!showManualEditor 
                    ? "Décrivez votre événement à l'IA pour générer instantanément un magnifique flyer A4 prêt à imprimer." 
                    : "Plan de travail manuel : ajustez la disposition, déplacez les blocs et configurez chaque détail."
                  }
                </p>
              </div>
              <button
                onClick={() => setShowManualEditor(!showManualEditor)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: showManualEditor 
                    ? "rgba(16, 185, 129, 0.15)" 
                    : "rgba(255, 255, 255, 0.05)",
                  color: showManualEditor ? "#10b981" : "var(--text-heading)",
                  border: showManualEditor 
                    ? "1px solid rgba(16, 185, 129, 0.3)" 
                    : "1px solid rgba(255, 255, 255, 0.1)",
                  borderRadius: "12px",
                  padding: "8px 16px",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all 0.25s ease",
                  boxShadow: showManualEditor ? "0 0 15px rgba(16, 185, 129, 0.1)" : "none"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = showManualEditor ? "rgba(16, 185, 129, 0.22)" : "rgba(255, 255, 255, 0.1)";
                  e.currentTarget.style.transform = "translateY(-1px)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = showManualEditor ? "rgba(16, 185, 129, 0.15)" : "rgba(255, 255, 255, 0.05)";
                  e.currentTarget.style.transform = "none";
                }}
              >
                {showManualEditor ? (
                  <>✨ Passer au Mode Simple (IA)</>
                ) : (
                  <>🔧 Mode Expert / Plan Manuel</>
                )}
              </button>
            </div>

            {!showManualEditor ? (
              <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
                {/* Column 1: AI Prompt & Options */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16, height: "100%", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                      <div>
                        <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                          <Sparkles size={16} style={{ color: "var(--primary)" }} /> Instructions de l'événement
                        </h3>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                          Donnez toutes les informations clés (nom, date, heure, lieu, ambiance, style, prix) et l'IA créera une superbe mise en page.
                        </span>
                      </div>

                      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                        <label className="form-label" style={{ fontWeight: 600 }}>Description détaillée</label>
                        <textarea
                          className="form-input"
                          rows={10}
                          value={flyerPrompt}
                          onChange={(e) => setFlyerPrompt(e.target.value)}
                          placeholder="Exemple : Grande kermesse annuelle le samedi 14 juin 2026 de 10h à 18h à la Maison des Associations de Lyon. Entrée libre, stands de jeux, maquillage pour enfants, tombola avec de nombreux lots et restauration burkinabè sur place (alloco, brochettes). Ambiance chaleureuse et festive, couleurs rouge, jaune, vert dominant."
                          style={{
                            resize: "vertical",
                            minHeight: 180,
                            lineHeight: "1.5",
                            fontSize: "0.85rem",
                            padding: "12px",
                            fontFamily: "inherit"
                          }}
                        />
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                        <div>
                          <label className="form-label">Modèle d'IA</label>
                          <select 
                            className="form-select" 
                            value={aiProvider} 
                            onChange={(e) => setAiProvider(e.target.value)}
                            style={{ padding: "8px 12px", fontSize: "0.85rem" }}
                          >
                            <option value="gemini">Google Gemini AI</option>
                            <option value="mistral">Mistral AI</option>
                            <option value="anthropic">Anthropic Claude 3.5</option>
                          </select>
                        </div>
                        <div>
                          <label className="form-label">Statut Clé API</label>
                          <div style={{
                            display: "flex",
                            alignItems: "center",
                            height: 38,
                            padding: "0 12px",
                            borderRadius: "10px",
                            background: "rgba(255,255,255,0.03)",
                            border: "1px solid var(--border)",
                            fontSize: "0.8rem",
                            color: aiApiKey || getEnvKeys()[aiProvider === "anthropic" ? "claude" : aiProvider] ? "#10b981" : "#f59e0b",
                            fontWeight: 600,
                            gap: 6
                          }}>
                            <span style={{
                              width: 8, height: 8, borderRadius: "50%",
                              background: aiApiKey || getEnvKeys()[aiProvider === "anthropic" ? "claude" : aiProvider] ? "#10b981" : "#f59e0b",
                              boxShadow: aiApiKey || getEnvKeys()[aiProvider === "anthropic" ? "claude" : aiProvider] 
                                ? "0 0 8px #10b981" 
                                : "0 0 8px #f59e0b"
                            }} />
                            {aiApiKey || getEnvKeys()[aiProvider === "anthropic" ? "claude" : aiProvider] 
                              ? "Clé Active (.env ou config)" 
                              : "Aucune clé configurée"
                            }
                          </div>
                        </div>
                      </div>
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <button
                        className="btn-primary"
                        onClick={handleFlyerAiRewrite}
                        disabled={isGeneratingFlyer || !flyerPrompt.trim()}
                        style={{
                          width: "100%",
                          padding: "14px 20px",
                          fontSize: "0.95rem",
                          fontWeight: 700,
                          borderRadius: "12px",
                          background: "linear-gradient(135deg, #10b981, #06b6d4, #6366f1)",
                          boxShadow: "0 4px 20px rgba(16, 185, 129, 0.25)",
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 10,
                          cursor: "pointer",
                          transition: "all 0.2s ease"
                        }}
                        onMouseEnter={(e) => {
                          if (!isGeneratingFlyer && flyerPrompt.trim()) {
                            e.currentTarget.style.boxShadow = "0 6px 24px rgba(16, 185, 129, 0.4)";
                            e.currentTarget.style.transform = "translateY(-1px)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = "0 4px 20px rgba(16, 185, 129, 0.25)";
                          e.currentTarget.style.transform = "none";
                        }}
                      >
                        {isGeneratingFlyer ? (
                          <>
                            <Sparkles size={18} className="animate-spin" />
                            Génération de la composition en cours...
                          </>
                        ) : (
                          <>
                            <Sparkles size={18} />
                            Générer le Flyer directement avec l'IA
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Column 2: Uploads & Assets */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 6 }}>
                        <Upload size={16} style={{ color: "var(--primary)" }} /> Visuels et Ressources de l'Association
                      </h3>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Importez vos logos, illustrations (jusqu'à 5) et images de fond. Ils seront intégrés au flyer.
                      </span>
                    </div>

                    {/* Logo & Background row */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                      {/* Logo uploader */}
                      <div style={{
                        border: "1px dashed var(--border)",
                        borderRadius: "12px",
                        padding: 14,
                        background: "rgba(255,255,255,0.01)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minHeight: 120,
                        position: "relative"
                      }}>
                        {uploadedLogo ? (
                          <>
                            <img src={uploadedLogo} alt="Logo" style={{ height: 45, objectFit: "contain", borderRadius: 4 }} />
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Logo personnalisé chargé</span>
                            <button
                              onClick={() => setUploadedLogo("")}
                              style={{
                                position: "absolute", top: 8, right: 8, background: "rgba(239, 68, 68, 0.15)",
                                border: "none", color: "#ef4444", borderRadius: "50%", width: 20, height: 20,
                                display: "grid", placeItems: "center", cursor: "pointer", fontSize: 10
                              }}
                              title="Supprimer le logo"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(99, 102, 241, 0.1)", display: "grid", placeItems: "center", color: "var(--primary)" }}>
                              <Sparkles size={16} />
                            </div>
                            <label className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.75rem", cursor: "pointer", minHeight: "auto" }}>
                              Charger Logo (.png)
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} style={{ display: "none" }} />
                            </label>
                          </>
                        )}
                      </div>

                      {/* Background uploader */}
                      <div style={{
                        border: "1px dashed var(--border)",
                        borderRadius: "12px",
                        padding: 14,
                        background: "rgba(255,255,255,0.01)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 8,
                        minHeight: 120,
                        position: "relative"
                      }}>
                        {uploadedBg ? (
                          <>
                            <div style={{ width: "100%", height: 45, borderRadius: 4, background: `url(${uploadedBg}) center/cover no-repeat` }} />
                            <span style={{ fontSize: "0.7rem", color: "var(--text-muted)" }}>Arrière-plan personnalisé</span>
                            <button
                              onClick={() => setUploadedBg("")}
                              style={{
                                position: "absolute", top: 8, right: 8, background: "rgba(239, 68, 68, 0.15)",
                                border: "none", color: "#ef4444", borderRadius: "50%", width: 20, height: 20,
                                display: "grid", placeItems: "center", cursor: "pointer", fontSize: 10
                              }}
                              title="Supprimer l'arrière-plan"
                            >
                              ✕
                            </button>
                          </>
                        ) : (
                          <>
                            <div style={{ width: 36, height: 36, borderRadius: "50%", background: "rgba(6, 182, 212, 0.1)", display: "grid", placeItems: "center", color: "#06b6d4" }}>
                              <Upload size={16} />
                            </div>
                            <label className="btn-ghost" style={{ padding: "6px 12px", fontSize: "0.75rem", cursor: "pointer", minHeight: "auto" }}>
                              Charger Fond (.jpg)
                              <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg")} style={{ display: "none" }} />
                            </label>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Multiple Floating image uploads (Up to 5) */}
                    <div style={{ borderTop: "1px solid var(--border)", paddingTop: 14 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                        <div>
                          <label className="form-label" style={{ margin: 0, fontSize: "0.78rem", fontWeight: 700 }}>
                            Images et Illustrations Flottantes ({uploadedImages.length}/5)
                          </label>
                          <span style={{ display: "block", fontSize: "0.7rem", color: "var(--text-muted)", marginTop: 2 }}>
                            Ces images illustreront les différentes parties de votre flyer.
                          </span>
                        </div>
                        {uploadedImages.length < 5 && (
                          <label className="btn-ghost" style={{ padding: "4px 10px", fontSize: "0.72rem", cursor: "pointer", minHeight: "auto", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            <Plus size={12} /> Ajouter une image
                            <input type="file" accept="image/*" onChange={handleAddFloatingImage} style={{ display: "none" }} />
                          </label>
                        )}
                      </div>

                      {uploadedImages.length > 0 ? (
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 8 }}>
                          {uploadedImages.map((img, idx) => (
                            <div 
                              key={img.id} 
                              style={{
                                position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden",
                                border: "1px solid var(--border)", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center"
                              }}
                            >
                              <img src={img.src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteFloatingImage(img.id); }}
                                style={{
                                  position: "absolute", top: 2, right: 2, width: 16, height: 16, borderRadius: "50%",
                                  background: "rgba(239, 68, 68, 0.95)", color: "white", border: "none", fontSize: 9,
                                  display: "grid", placeItems: "center", cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
                                }}
                              >
                                ✕
                              </button>
                              <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "white", fontSize: "0.55rem", textAlign: "center", fontWeight: 700 }}>
                                #{idx + 1}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ textAlign: "center", padding: "24px 10px", fontSize: "0.78rem", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 10, background: "rgba(255,255,255,0.01)" }}>
                          Aucune image flottante. Cliquez sur "Ajouter une image" pour charger vos illustrations.
                        </div>
                      )}
                    </div>

                    {(uploadedLogo || uploadedBg || uploadedImages.length > 0) && (
                      <button className="btn-danger" onClick={handleResetImages} style={{ width: "100%", padding: "10px", fontSize: "0.8rem", justifyContent: "center", borderRadius: "10px", marginTop: 6 }}>
                        Réinitialiser tous les visuels importés
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 24 }}>
                {/* Editor controls */}
                <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                  <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-heading)" }}>Créateur Visuel & AI</h3>
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Saisissez les infos ou laissez l'IA tout configurer !</span>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button 
                      onClick={handleFlyerTextOptimize}
                      disabled={isOptimizingTexts || isGeneratingFlyer}
                      title="Améliorer uniquement les textes (orthographe, style, clarté) en conservant votre disposition manuelle !"
                      style={{ 
                        padding: "6px 12px", 
                        fontSize: "0.8rem", 
                        gap: 5, 
                        background: "rgba(16, 185, 129, 0.15)", 
                        border: "1px solid rgba(16, 185, 129, 0.3)", 
                        color: "#10b981", 
                        borderRadius: "8px", 
                        display: "flex", 
                        alignItems: "center", 
                        cursor: "pointer", 
                        fontWeight: 600,
                        transition: "all 0.2s ease"
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.25)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(16, 185, 129, 0.15)"; }}
                    >
                      <Sparkles size={14} className={isOptimizingTexts ? "animate-spin" : ""} /> Améliorer Textes (IA)
                    </button>
                    <button 
                      className="btn-primary" 
                      onClick={handleFlyerAiRewrite}
                      disabled={isGeneratingFlyer || isOptimizingTexts}
                      title="Demander à l'IA d'organiser et placer les images et textes de manière optimale !"
                      style={{ padding: "6px 12px", fontSize: "0.8rem", gap: 5 }}
                    >
                      <Sparkles size={14} className={isGeneratingFlyer ? "animate-spin" : ""} /> Générer Tout (IA)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="form-label">Titre de l'événement</label>
                  <input 
                    type="text" className="form-input" 
                    placeholder="Ex: GRANDE SOIRÉE CULTURELLE ABL"
                    value={flyerData.title} 
                    onChange={(e) => setFlyerData({ ...flyerData, title: e.target.value })} 
                  />
                </div>

                <div>
                  <label className="form-label">Slogan publicitaire</label>
                  <input 
                    type="text" className="form-input" 
                    placeholder="Ex: Célébrons la Fraternité et la Solidarité"
                    value={flyerData.tagline} 
                    onChange={(e) => setFlyerData({ ...flyerData, tagline: e.target.value })} 
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">Date</label>
                    <input 
                      type="text" className="form-input" 
                      placeholder="Ex: Samedi 20 Juin 2026"
                      value={flyerData.date} 
                      onChange={(e) => setFlyerData({ ...flyerData, date: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Horaires</label>
                    <input 
                      type="text" className="form-input" 
                      placeholder="Ex: À partir de 19h00"
                      value={flyerData.time} 
                      onChange={(e) => setFlyerData({ ...flyerData, time: e.target.value })} 
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Lieu exact</label>
                  <input 
                    type="text" className="form-input" 
                    placeholder="Ex: 22 rue Alfred de Musset, 69100 Villeurbanne"
                    value={flyerData.place} 
                    onChange={(e) => setFlyerData({ ...flyerData, place: e.target.value })} 
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">Tarif</label>
                    <input 
                      type="text" className="form-input" 
                      placeholder="Ex: 15 € (Entrée + Dîner)"
                      value={flyerData.price} 
                      onChange={(e) => setFlyerData({ ...flyerData, price: e.target.value })} 
                    />
                  </div>
                  <div>
                    <label className="form-label">Contacts et réservations</label>
                    <input 
                      type="text" className="form-input" 
                      placeholder="Ex: abllyon@yahoo.fr · 06 69 18 55 67 · abl-asso.fr"
                      value={flyerData.contact} 
                      onChange={(e) => setFlyerData({ ...flyerData, contact: e.target.value })} 
                    />
                  </div>
                </div>
              </div>

              {/* DYNAMIC SELECTED ELEMENT STYLIST PROPERTY CARD */}
              <div className="admin-card" style={{ border: "1px solid var(--primary-light)", background: "rgba(99,102,241,0.02)" }}>
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 6, textTransform: "uppercase" }}>
                  <Type size={14} style={{ color: "var(--primary)" }} /> Style de l'élément sélectionné : <span style={{ color: "var(--primary)" }}>{selectedElementId}</span>
                </h4>

                {selectedElementId.startsWith("image_") ? (
                  /* Custom Style panel for Uploaded Image */
                  <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                    <div>
                      <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                        <span>Largeur de l'image (%)</span>
                        <span>{uploadedImages.find(img => `image_${img.id}` === selectedElementId)?.w ?? 35}%</span>
                      </label>
                      <input 
                        type="range" min="15" max="80" 
                        value={uploadedImages.find(img => `image_${img.id}` === selectedElementId)?.w ?? 35} 
                        onChange={(e) => {
                          const wVal = Number(e.target.value);
                          setUploadedImages(prev => prev.map(img => `image_${img.id}` === selectedElementId ? { ...img, w: wVal } : img));
                        }}
                        style={{ width: "100%", accentColor: "var(--primary)" }} 
                      />
                    </div>
                    <button 
                      className="btn-danger" 
                      style={{ padding: "6px 12px", fontSize: "0.78rem", justifyContent: "center" }}
                      onClick={() => handleDeleteFloatingImage(selectedElementId.replace("image_", ""))}
                    >
                      <Trash2 size={12} style={{ marginRight: 4 }} /> Retirer cette image du flyer
                    </button>
                  </div>
                ) : (
                  /* Font & Color Stylist Panel for Text elements */
                  <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>Taille de police (px)</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input 
                            type="range" min="10" max="64" 
                            value={getActiveStyle().fontSize || 14} 
                            onChange={(e) => updateStyleAttribute("fontSize", Number(e.target.value))}
                            style={{ flex: 1, accentColor: "var(--primary)" }}
                          />
                          <span style={{ fontSize: "0.8rem", fontWeight: 700 }}>{getActiveStyle().fontSize}px</span>
                        </div>
                      </div>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>Famille de Police</label>
                        <select 
                          className="form-select" style={{ padding: "4px 8px", fontSize: "0.8rem" }}
                          value={getActiveStyle().fontFamily || "Outfit"}
                          onChange={(e) => updateStyleAttribute("fontFamily", e.target.value)}
                        >
                          <option value="Outfit">Outfit (Moderne, Épuré)</option>
                          <option value="Inter">Inter (Professionnel, Propre)</option>
                          <option value="Montserrat">Montserrat (Gras, Puissant)</option>
                          <option value="Playfair Display">Playfair Display (Classique Serif)</option>
                          <option value="Courier Prime">Courier Retro (Machine)</option>
                          <option value="Special Elite">Special Elite (Grungy Typewriter)</option>
                        </select>
                      </div>
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 12, alignItems: "center" }}>
                      <div>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>Type de Caractère / Style</label>
                        <div style={{ display: "flex", gap: 6 }}>
                          <button 
                            className={`btn-ghost ${getActiveStyle().fontWeight === "800" ? "active" : ""}`}
                            style={{ padding: "4px 8px", minHeight: "auto" }}
                            onClick={() => updateStyleAttribute("fontWeight", getActiveStyle().fontWeight === "800" ? "normal" : "800")}
                            title="Gras"
                          >
                            <Bold size={13} />
                          </button>
                          <button 
                            className={`btn-ghost ${getActiveStyle().fontStyle === "italic" ? "active" : ""}`}
                            style={{ padding: "4px 8px", minHeight: "auto" }}
                            onClick={() => updateStyleAttribute("fontStyle", getActiveStyle().fontStyle === "italic" ? "normal" : "italic")}
                            title="Italique"
                          >
                            <Italic size={13} />
                          </button>
                          <button 
                            className={`btn-ghost ${getActiveStyle().textTransform === "uppercase" ? "active" : ""}`}
                            style={{ padding: "4px 8px", minHeight: "auto", fontSize: "0.7rem", fontWeight: 700 }}
                            onClick={() => updateStyleAttribute("textTransform", getActiveStyle().textTransform === "uppercase" ? "none" : "uppercase")}
                            title="MAJUSCULES"
                          >
                            AA
                          </button>
                          <button 
                            className={`btn-ghost ${getActiveStyle().textDecoration === "underline" ? "active" : ""}`}
                            style={{ padding: "4px 8px", minHeight: "auto", textDecoration: "underline", fontSize: "0.7rem", fontWeight: 700 }}
                            onClick={() => updateStyleAttribute("textDecoration", getActiveStyle().textDecoration === "underline" ? "none" : "underline")}
                            title="Souligné"
                          >
                            U
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="form-label" style={{ fontSize: "0.72rem" }}>Couleur du Texte</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <input 
                            type="color" 
                            value={getActiveStyle().color || "#ffffff"} 
                            onChange={(e) => updateStyleAttribute("color", e.target.value)}
                            style={{ width: 28, height: 28, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" }}
                          />
                          <span style={{ fontSize: "0.75rem", fontFamily: "monospace" }}>{getActiveStyle().color}</span>
                        </div>
                      </div>
                    </div>

                    {selectedElementId === "details" && (
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                        <div>
                          <label className="form-label" style={{ fontSize: "0.72rem" }}>Fond de boîte</label>
                          <input 
                            type="color" 
                            value={getActiveStyle().bgColor?.includes("rgba") ? "#0f172a" : getActiveStyle().bgColor || "#0f172a"} 
                            onChange={(e) => updateStyleAttribute("bgColor", e.target.value)}
                            style={{ width: "100%", height: 24, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" }}
                          />
                        </div>
                        <div>
                          <label className="form-label" style={{ fontSize: "0.72rem" }}>Bordure de boîte</label>
                          <input 
                            type="color" 
                            value={getActiveStyle().borderColor?.includes("rgba") ? "#3b82f6" : getActiveStyle().borderColor || "#3b82f6"} 
                            onChange={(e) => updateStyleAttribute("borderColor", e.target.value)}
                            style={{ width: "100%", height: 24, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MEDIA & IMAGES MANAGER (Logo, Background, up to 5 illustrations) */}
              <div className="admin-card">
                <h4 style={{ fontSize: "0.85rem", fontWeight: 700, margin: "0 0 12px", color: "var(--text-heading)", textTransform: "uppercase" }}>
                  Gestionnaire d'Images & Fonds
                </h4>

                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Logo de l'Asso</label>
                      <label className="btn-ghost" style={{ width: "100%", padding: "6px 12px", fontSize: "0.78rem", cursor: "pointer", justifyContent: "center" }}>
                        <Upload size={14} style={{ marginRight: 4 }} /> {uploadedLogo ? "Modifier logo" : "Logo (.png/.svg)"}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "logo")} style={{ display: "none" }} />
                      </label>
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Image de Fond</label>
                      <label className="btn-ghost" style={{ width: "100%", padding: "6px 12px", fontSize: "0.78rem", cursor: "pointer", justifyContent: "center" }}>
                        <Upload size={14} style={{ marginRight: 4 }} /> {uploadedBg ? "Modifier fond" : "Fond (.jpg)"}
                        <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, "bg")} style={{ display: "none" }} />
                      </label>
                    </div>
                  </div>

                  {/* Multiple Floating image uploads (Up to 5) */}
                  <div style={{ borderTop: "1px solid var(--border)", paddingTop: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <label className="form-label" style={{ margin: 0, fontSize: "0.72rem" }}>
                        Images Flottantes ({uploadedImages.length}/5)
                      </label>
                      {uploadedImages.length < 5 && (
                        <label className="btn-ghost" style={{ padding: "2px 8px", fontSize: "0.72rem", cursor: "pointer", minHeight: "auto" }}>
                          <Plus size={12} style={{ marginRight: 2 }} /> Ajouter image
                          <input type="file" accept="image/*" onChange={handleAddFloatingImage} style={{ display: "none" }} />
                        </label>
                      )}
                    </div>

                    {uploadedImages.length > 0 ? (
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 6 }}>
                        {uploadedImages.map((img, idx) => (
                          <div 
                            key={img.id} 
                            onClick={() => setSelectedElementId(`image_${img.id}`)}
                            style={{
                              position: "relative", aspectRatio: "1", borderRadius: 6, overflow: "hidden",
                              border: selectedElementId === `image_${img.id}` ? "2px solid var(--primary)" : "1px solid var(--border)",
                              cursor: "pointer", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center"
                            }}
                          >
                            <img src={img.src} alt="" style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "cover" }} />
                            <button
                              onClick={(e) => { e.stopPropagation(); handleDeleteFloatingImage(img.id); }}
                              style={{
                                position: "absolute", top: 1, right: 1, width: 14, height: 14, borderRadius: "50%",
                                background: "rgba(239, 68, 68, 0.85)", color: "white", border: "none", fontSize: 8,
                                display: "grid", placeItems: "center", cursor: "pointer"
                              }}
                            >
                              ✕
                            </button>
                            <span style={{ position: "absolute", bottom: 0, left: 0, right: 0, background: "rgba(0,0,0,0.6)", color: "white", fontSize: "0.52rem", textAlign: "center", fontWeight: 700 }}>
                              #{idx + 1}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div style={{ textAlign: "center", padding: "10px", fontSize: "0.75rem", color: "var(--text-muted)", border: "1px dashed var(--border)", borderRadius: 6 }}>
                        Aucune image flottante. Cliquez sur "Ajouter image" pour intégrer vos visuels (jusqu'à 5).
                      </div>
                    )}
                  </div>

                  {(uploadedLogo || uploadedBg || uploadedImages.length > 0) && (
                    <button className="btn-danger" onClick={handleResetImages} style={{ width: "100%", padding: "6px", fontSize: "0.78rem", justifyContent: "center" }}>
                      Réinitialiser toutes les images importées
                    </button>
                  )}
                </div>
              </div>

              {/* THEME & CUSTOM PALETTE SELECTION */}
              <div className="admin-card">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div>
                    <label className="form-label">Thème Palette</label>
                    <select 
                      className="form-select" 
                      value={flyerData.colorTheme}
                      onChange={(e) => setFlyerData({ ...flyerData, colorTheme: e.target.value })}
                    >
                      <option value="sunset">Sunset Gold (Orange/Rose)</option>
                      <option value="galaxy">Deep Galaxy (Indigo/Magenta)</option>
                      <option value="emerald">Emerald Forest (Vert/Cyan)</option>
                      <option value="cyber">Cyberpunk Dark (Sombre/Bleu)</option>
                      <option value="classic">ABL Royal (Bleu Roi/Teal)</option>
                      <option value="custom">Palette sur mesure 🎨</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Style visuel</label>
                    <select className="form-select" value={flyerStyle} onChange={(e) => setFlyerStyle(e.target.value)}>
                      <option value="glass">Glassmorphism (Moderne)</option>
                      <option value="modern">Minimalist clean</option>
                      <option value="bold">Typographie géante</option>
                    </select>
                  </div>
                </div>

                {flyerData.colorTheme === "custom" && (
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, borderTop: "1px solid var(--border)", marginTop: 12, paddingTop: 12 }}>
                    <div>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Couleur de Départ</label>
                      <input 
                        type="color" value={customBgColor1} onChange={(e) => setCustomBgColor1(e.target.value)}
                        style={{ width: "100%", height: 26, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" }}
                      />
                    </div>
                    <div>
                      <label className="form-label" style={{ fontSize: "0.72rem" }}>Couleur de Fin</label>
                      <input 
                        type="color" value={customBgColor2} onChange={(e) => setCustomBgColor2(e.target.value)}
                        style={{ width: "100%", height: 26, border: "none", cursor: "pointer", borderRadius: 4, background: "transparent" }}
                      />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <button className="btn-ghost" onClick={handleResetPositions} title="Réinitialiser l'emplacement des blocs" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <RefreshCcw size={14} style={{ marginRight: 4 }} /> Reset Positions
                    </button>
                    <button className="btn-primary" onClick={downloadFlyerPdf} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
                      <Download size={14} style={{ marginRight: 4 }} /> Télécharger PDF
                    </button>
                  </div>
                  <button 
                    onClick={() => window.print()} 
                    style={{ 
                      display: "flex", 
                      alignItems: "center", 
                      justifyContent: "center", 
                      gap: 6, 
                      width: "100%", 
                      background: "linear-gradient(135deg, #10b981, #059669)", 
                      color: "white", 
                      padding: "9px 16px", 
                      borderRadius: 8, 
                      border: "none", 
                      fontWeight: 600,
                      fontSize: "0.85rem",
                      cursor: "pointer",
                      boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                      transition: "transform 0.15s ease"
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = "translateY(-1px)"}
                    onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                  >
                    🖨️ Imprimer le Flyer en A4
                  </button>
                </div>

                <style>{`
                  @media print {
                    html, body {
                      margin: 0 !important;
                      padding: 0 !important;
                      background: white !important;
                    }
                    .admin-sidebar, .admin-topbar, .tab-buttons-container, .card-control-panel, .tools-header-banner, button, .topbar-actions, header, .drag-handle-indicator {
                      display: none !important;
                    }
                    .admin-main {
                      padding: 0 !important;
                      margin: 0 !important;
                      background: transparent !important;
                      display: block !important;
                    }
                    .admin-layout {
                      display: block !important;
                      padding: 0 !important;
                      margin: 0 !important;
                    }
                    
                    /* When printing main editor flyer */
                    body:not(.print-preview-active) #printable-flyer {
                      display: block !important;
                      width: 210mm !important;
                      height: 297mm !important;
                      margin: 0 auto !important;
                      border: none !important;
                      box-shadow: none !important;
                      border-radius: 0 !important;
                      transform: none !important;
                      position: relative !important;
                      top: 0 !important;
                      left: 0 !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    body:not(.print-preview-active) #printable-preview-flyer {
                      display: none !important;
                    }

                    /* When printing AI Preview popup flyer */
                    body.print-preview-active #printable-preview-flyer {
                      display: block !important;
                      width: 210mm !important;
                      height: 297mm !important;
                      margin: 0 auto !important;
                      border: none !important;
                      box-shadow: none !important;
                      border-radius: 0 !important;
                      transform: none !important;
                      position: relative !important;
                      top: 0 !important;
                      left: 0 !important;
                      -webkit-print-color-adjust: exact !important;
                      print-color-adjust: exact !important;
                    }
                    body.print-preview-active #printable-flyer {
                      display: none !important;
                    }
                  }
                `}</style>
              </div>

            </div>

            {/* Drag and Drop Preview Area */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", textTransform: "uppercase" }}>Aperçu & Montage</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.72rem", color: "var(--primary)" }}>
                  <Move size={12} /> Glissez/Déplacez et cliquez pour éditer !
                </span>
              </div>

              {/* Flyer Body Canvas */}
              <div 
                id="printable-flyer"
                style={{
                  width: "100%",
                  aspectRatio: "1/1.414", // A4 Ratio
                  background: uploadedBg 
                    ? `url(${uploadedBg}) center/cover no-repeat` 
                    : flyerData.colorTheme === "custom" 
                      ? `linear-gradient(135deg, ${customBgColor1}, ${customBgColor2})` 
                      : THEME_STYLES[flyerData.colorTheme]?.bg || THEME_STYLES.classic.bg,
                  borderRadius: 16,
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "var(--shadow-md)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  userSelect: "none"
                }}
              >
                {/* Subtle dark gradient overlay to integrate background and text seamlessly */}
                {uploadedBg && (
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)",
                    pointerEvents: "none",
                    zIndex: 1
                  }} />
                )}

                {/* Visual Glow overlay ring if no custom background is loaded */}
                {!uploadedBg && flyerData.colorTheme !== "custom" && (
                  <div style={{
                    position: "absolute", width: 220, height: 220,
                    borderRadius: "50%", background: THEME_STYLES[flyerData.colorTheme]?.accent || THEME_STYLES.classic.accent,
                    top: -80, right: -80, opacity: 0.35, filter: "blur(50px)", pointerEvents: "none"
                  }} />
                )}

                {/* 1. BRANDING / LOGO (DRAGGABLE) */}
                <div 
                  onMouseDown={(e) => handleDragStart(e, "logo")}
                  onTouchStart={(e) => handleDragStart(e, "logo")}
                  onClick={(e) => { e.stopPropagation(); setSelectedElementId("logo"); }}
                  className={`draggable-flyer-item ${selectedElementId === "logo" ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${getSafePos(positions, "logo", { x: 4, y: 3 }).x}%`,
                    top: `${getSafePos(positions, "logo", { x: 4, y: 3 }).y}%`,
                    cursor: "grab",
                    zIndex: 20
                  }}
                >
                  {uploadedLogo ? (
                    <img src={uploadedLogo} alt="Logo" style={{ height: 38, objectFit: "contain", borderRadius: 4 }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)",
                        display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.78rem"
                      }}>🇧🇫</div>
                      <div>
                        <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "1px", opacity: 0.9 }}>
                          ASSOCIATION DES BURKINABÈ DE LYON
                        </div>
                        <div style={{ fontSize: "0.5rem", letterSpacing: "0.5px", opacity: 0.7 }}>
                          ABL - RECONSTRUISONS PAR LA FRATERNITÉ
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="drag-handle-indicator">Logo</div>
                </div>

                {/* 2. TITLE (DRAGGABLE) */}
                <div 
                  onMouseDown={(e) => handleDragStart(e, "title")}
                  onTouchStart={(e) => handleDragStart(e, "title")}
                  onClick={(e) => { e.stopPropagation(); setSelectedElementId("title"); }}
                  className={`draggable-flyer-item ${selectedElementId === "title" ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${getSafePos(positions, "title", { x: 4, y: 16 }).x}%`,
                    top: `${getSafePos(positions, "title", { x: 4, y: 16 }).y}%`,
                    cursor: "grab",
                    maxWidth: "92%",
                    zIndex: 20
                  }}
                >
                  <h2 style={{
                    fontSize: `${elementStyles.title.fontSize}px`,
                    fontFamily: elementStyles.title.fontFamily,
                    fontWeight: elementStyles.title.fontWeight === "800" ? 800 : "normal",
                    fontStyle: elementStyles.title.fontStyle,
                    color: elementStyles.title.color,
                    textTransform: elementStyles.title.textTransform,
                    textDecoration: elementStyles.title.textDecoration,
                    margin: 0,
                    lineHeight: 1.2,
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)"
                  }}>{renderSafeString(flyerData.title) || "Titre de l'événement"}</h2>
                  <div className="drag-handle-indicator">Titre</div>
                </div>

                {/* 3. TAGLINE (DRAGGABLE) */}
                <div 
                  onMouseDown={(e) => handleDragStart(e, "tagline")}
                  onTouchStart={(e) => handleDragStart(e, "tagline")}
                  onClick={(e) => { e.stopPropagation(); setSelectedElementId("tagline"); }}
                  className={`draggable-flyer-item ${selectedElementId === "tagline" ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${getSafePos(positions, "tagline", { x: 4, y: 34 }).x}%`,
                    top: `${getSafePos(positions, "tagline", { x: 4, y: 34 }).y}%`,
                    cursor: "grab",
                    maxWidth: "92%",
                    zIndex: 20
                  }}
                >
                  <p style={{
                    fontSize: `${elementStyles.tagline.fontSize}px`,
                    fontFamily: elementStyles.tagline.fontFamily,
                    fontWeight: elementStyles.tagline.fontWeight === "800" ? 800 : "normal",
                    fontStyle: elementStyles.tagline.fontStyle,
                    color: elementStyles.tagline.color,
                    textTransform: elementStyles.tagline.textTransform,
                    textDecoration: elementStyles.tagline.textDecoration,
                    margin: 0,
                    lineHeight: 1.3,
                    borderLeft: "2px solid rgba(255,255,255,0.4)",
                    paddingLeft: 8,
                    textShadow: "0 1px 4px rgba(0,0,0,0.4)"
                  }}>{renderSafeString(flyerData.tagline) || "Slogan publicitaire"}</p>
                  <div className="drag-handle-indicator">Slogan</div>
                </div>

                {/* 4. DETAILS BOX (DRAGGABLE) */}
                <div 
                  onMouseDown={(e) => handleDragStart(e, "details")}
                  onTouchStart={(e) => handleDragStart(e, "details")}
                  onClick={(e) => { e.stopPropagation(); setSelectedElementId("details"); }}
                  className={`draggable-flyer-item ${selectedElementId === "details" ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${getSafePos(positions, "details", { x: 4, y: 44 }).x}%`,
                    top: `${getSafePos(positions, "details", { x: 4, y: 44 }).y}%`,
                    cursor: "grab",
                    width: "48%",
                    zIndex: 15
                  }}
                >
                  <div style={{
                    background: elementStyles.details.bgColor || "rgba(255,255,255,0.06)",
                    backdropFilter: flyerStyle === "glass" ? "blur(12px)" : "none",
                    border: `1px solid ${elementStyles.details.borderColor || "rgba(255,255,255,0.12)"}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--primary)", textTransform: "uppercase" }}>Date et Heure</span>
                      <div style={{ 
                        fontSize: `${elementStyles.details.fontSize}px`,
                        fontFamily: elementStyles.details.fontFamily,
                        fontWeight: elementStyles.details.fontWeight === "800" ? 800 : "bold",
                        fontStyle: elementStyles.details.fontStyle,
                        color: elementStyles.details.color 
                      }}>{renderSafeString(flyerData.date)}</div>
                      <div style={{ fontSize: "0.68rem", opacity: 0.8 }}>{renderSafeString(flyerData.time)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--primary)", textTransform: "uppercase" }}>Lieu</span>
                      <div style={{ 
                        fontSize: `${elementStyles.details.fontSize - 1}px`, 
                        fontFamily: elementStyles.details.fontFamily,
                        color: elementStyles.details.color,
                        lineHeight: 1.25 
                      }}>{renderSafeString(flyerData.place, ", ")}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--primary)", textTransform: "uppercase" }}>Tarif</span>
                      <div style={{ 
                        fontSize: `${elementStyles.details.fontSize}px`, 
                        fontFamily: elementStyles.details.fontFamily,
                        fontWeight: "700", 
                        color: "#10b981" 
                      }}>{renderSafeString(flyerData.price)}</div>
                    </div>
                  </div>
                  <div className="drag-handle-indicator">Détails</div>
                </div>

                {/* 5. MULTIPLE UPLOADED FLOATING IMAGES (DRAGGABLE & RESIZABLE) */}
                {uploadedImages.map((img, index) => {
                  const imgPos = positions[`image_${img.id}`] || { x: 50, y: 50 };
                  const isSelected = selectedElementId === `image_${img.id}`;
                  return (
                    <div 
                      key={img.id}
                      onMouseDown={(e) => handleDragStart(e, `image_${img.id}`)}
                      onTouchStart={(e) => handleDragStart(e, `image_${img.id}`)}
                      onClick={(e) => { e.stopPropagation(); setSelectedElementId(`image_${img.id}`); }}
                      className={`draggable-flyer-item ${isSelected ? "selected" : ""}`}
                      style={{
                        position: "absolute",
                        left: `${imgPos.x}%`,
                        top: `${imgPos.y}%`,
                        width: `${img.w}%`,
                        cursor: "grab",
                        zIndex: 16
                      }}
                    >
                      <img 
                        src={img.src} 
                        alt="" 
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          boxShadow: isSelected ? "0 0 16px var(--primary)" : "0 8px 24px rgba(0,0,0,0.5)",
                          border: isSelected ? "2px solid var(--primary)" : "1px solid rgba(255,255,255,0.15)",
                          display: "block"
                        }} 
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteFloatingImage(img.id); }}
                        style={{
                          position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%",
                          background: "#ef4444", color: "white", border: "none", fontSize: 10,
                          display: "grid", placeItems: "center", cursor: "pointer", zIndex: 30, boxShadow: "0 2px 6px rgba(0,0,0,0.3)"
                        }}
                      >
                        ✕
                      </button>
                      <div className="drag-handle-indicator">Image #{index + 1}</div>
                    </div>
                  );
                })}

                {/* 6. FOOTER / CONTACTS (DRAGGABLE) */}
                <div 
                  onMouseDown={(e) => handleDragStart(e, "footer")}
                  onTouchStart={(e) => handleDragStart(e, "footer")}
                  onClick={(e) => { e.stopPropagation(); setSelectedElementId("footer"); }}
                  className={`draggable-flyer-item ${selectedElementId === "footer" ? "selected" : ""}`}
                  style={{
                    position: "absolute",
                    left: `${getSafePos(positions, "footer", { x: 4, y: 86 }).x}%`,
                    top: `${getSafePos(positions, "footer", { x: 4, y: 86 }).y}%`,
                    cursor: "grab",
                    width: "92%",
                    zIndex: 20
                  }}
                >
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: `${elementStyles.footer.fontSize}px`,
                    fontFamily: elementStyles.footer.fontFamily,
                    fontWeight: elementStyles.footer.fontWeight === "800" ? 800 : "bold",
                    fontStyle: elementStyles.footer.fontStyle,
                    color: elementStyles.footer.color,
                    textTransform: elementStyles.footer.textTransform,
                    textDecoration: elementStyles.footer.textDecoration,
                    borderTop: "1px solid rgba(255,255,255,0.18)",
                    paddingTop: 8
                  }}>
                    <div>
                      <strong>RÉSERVATIONS :</strong>
                      <div style={{ fontWeight: 600 }}>{renderSafeString(flyerData.contact)}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.52rem", letterSpacing: "1px", textTransform: "uppercase" }}>
                      Mon Asso 2026
                    </div>
                  </div>
                  <div className="drag-handle-indicator">Contacts</div>
                </div>

              </div>
            </div>
          </div>
        )}
      </div>
    )}

        {/* AI GENERATED FLYER PREVIEW POPUP MODAL */}
        {isPreviewModalOpen && aiPreviewBlueprint && (
          <div style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(15, 23, 42, 0.8)",
            backdropFilter: "blur(18px)",
            zIndex: 9999,
            display: "grid",
            placeItems: "center",
            padding: "24px 16px",
            overflowY: "auto"
          }}>
            <div style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 20,
              width: "100%",
              maxWidth: 450,
              position: "relative",
              color: "white"
            }}>
              {/* Flyer Body Canvas */}
              <div 
                id="printable-preview-flyer"
                style={{
                  width: "100%",
                  aspectRatio: "1/1.414",
                  background: uploadedBg 
                    ? `url(${uploadedBg}) center/cover no-repeat` 
                    : aiPreviewBlueprint.colorTheme === "custom" 
                      ? `linear-gradient(135deg, ${customBgColor1}, ${customBgColor2})` 
                      : THEME_STYLES[aiPreviewBlueprint.colorTheme]?.bg || THEME_STYLES.classic.bg,
                  borderRadius: 20,
                  color: "white",
                  position: "relative",
                  overflow: "hidden",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.85)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  userSelect: "none"
                }}
              >
                {/* Subtle dark gradient overlay to integrate background and text seamlessly */}
                {uploadedBg && (
                  <div style={{
                    position: "absolute",
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: "linear-gradient(180deg, rgba(0,0,0,0.3) 0%, rgba(0,0,0,0.65) 100%)",
                    pointerEvents: "none",
                    zIndex: 1
                  }} />
                )}

                {!uploadedBg && aiPreviewBlueprint.colorTheme !== "custom" && (
                  <div style={{
                    position: "absolute", width: 220, height: 220,
                    borderRadius: "50%", background: THEME_STYLES[aiPreviewBlueprint.colorTheme]?.accent || THEME_STYLES.classic.accent,
                    top: -80, right: -80, opacity: 0.35, filter: "blur(50px)", pointerEvents: "none"
                  }} />
                )}

                {/* 1. BRANDING / LOGO */}
                <div style={{
                  position: "absolute",
                  left: `${getSafePos(aiPreviewBlueprint.positions, "logo", { x: 4, y: 3 }).x}%`,
                  top: `${getSafePos(aiPreviewBlueprint.positions, "logo", { x: 4, y: 3 }).y}%`,
                  zIndex: 20
                }}>
                  {uploadedLogo ? (
                    <img src={uploadedLogo} alt="Logo" style={{ height: 38, objectFit: "contain", borderRadius: 4 }} />
                  ) : (
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <div style={{
                        width: 24, height: 24, borderRadius: "50%",
                        background: "rgba(255,255,255,0.2)", backdropFilter: "blur(6px)",
                        display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.78rem"
                      }}>🇧🇫</div>
                      <div>
                        <div style={{ fontSize: "0.62rem", fontWeight: 800, letterSpacing: "1px", opacity: 0.9 }}>
                          ASSOCIATION DES BURKINABÈ DE LYON
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. TITLE */}
                <div style={{
                  position: "absolute",
                  left: `${getSafePos(aiPreviewBlueprint.positions, "title", { x: 4, y: 16 }).x}%`,
                  top: `${getSafePos(aiPreviewBlueprint.positions, "title", { x: 4, y: 16 }).y}%`,
                  width: "92%",
                  zIndex: 20
                }}>
                  <h2 style={{
                    fontSize: `${getSafeStyle(aiPreviewBlueprint.styles, "title", "fontSize", 22)}px`,
                    fontFamily: getSafeStyle(aiPreviewBlueprint.styles, "title", "fontFamily", "Outfit"),
                    fontWeight: getSafeStyle(aiPreviewBlueprint.styles, "title", "fontWeight", "800") === "800" ? 800 : "normal",
                    fontStyle: getSafeStyle(aiPreviewBlueprint.styles, "title", "fontStyle", "normal"),
                    color: getSafeStyle(aiPreviewBlueprint.styles, "title", "color", "#ffffff"),
                    textTransform: getSafeStyle(aiPreviewBlueprint.styles, "title", "textTransform", "uppercase"),
                    textDecoration: getSafeStyle(aiPreviewBlueprint.styles, "title", "textDecoration", "none"),
                    margin: 0,
                    lineHeight: 1.2,
                    textShadow: "0 2px 8px rgba(0,0,0,0.5)"
                  }}>{renderSafeString(aiPreviewBlueprint.title) || "Titre de l'événement"}</h2>
                </div>

                {/* 3. TAGLINE */}
                <div style={{
                  position: "absolute",
                  left: `${getSafePos(aiPreviewBlueprint.positions, "tagline", { x: 4, y: 34 }).x}%`,
                  top: `${getSafePos(aiPreviewBlueprint.positions, "tagline", { x: 4, y: 34 }).y}%`,
                  width: "92%",
                  zIndex: 20
                }}>
                  <p style={{
                    fontSize: `${getSafeStyle(aiPreviewBlueprint.styles, "tagline", "fontSize", 13)}px`,
                    fontFamily: getSafeStyle(aiPreviewBlueprint.styles, "tagline", "fontFamily", "Outfit"),
                    fontWeight: getSafeStyle(aiPreviewBlueprint.styles, "tagline", "fontWeight", "normal") === "800" ? 800 : "normal",
                    fontStyle: getSafeStyle(aiPreviewBlueprint.styles, "tagline", "fontStyle", "italic"),
                    color: getSafeStyle(aiPreviewBlueprint.styles, "tagline", "color", "#cbd5e1"),
                    textTransform: getSafeStyle(aiPreviewBlueprint.styles, "tagline", "textTransform", "none"),
                    textDecoration: getSafeStyle(aiPreviewBlueprint.styles, "tagline", "textDecoration", "none"),
                    margin: 0,
                    lineHeight: 1.3,
                    borderLeft: "2px solid rgba(255,255,255,0.4)",
                    paddingLeft: 8,
                    textShadow: "0 1px 4px rgba(0,0,0,0.4)"
                  }}>{renderSafeString(aiPreviewBlueprint.tagline) || "Slogan publicitaire"}</p>
                </div>

                {/* 4. DETAILS BOX */}
                <div style={{
                  position: "absolute",
                  left: `${getSafePos(aiPreviewBlueprint.positions, "details", { x: 4, y: 44 }).x}%`,
                  top: `${getSafePos(aiPreviewBlueprint.positions, "details", { x: 4, y: 44 }).y}%`,
                  width: "48%",
                  zIndex: 15
                }}>
                  <div style={{
                    background: getSafeStyle(aiPreviewBlueprint.styles, "details", "bgColor", "rgba(255,255,255,0.06)"),
                    backdropFilter: "blur(12px)",
                    border: `1px solid ${getSafeStyle(aiPreviewBlueprint.styles, "details", "borderColor", "rgba(255,255,255,0.12)")}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8
                  }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--primary)", textTransform: "uppercase" }}>Date et Heure</span>
                      <div style={{ 
                        fontSize: `${getSafeStyle(aiPreviewBlueprint.styles, "details", "fontSize", 12)}px`,
                        fontFamily: getSafeStyle(aiPreviewBlueprint.styles, "details", "fontFamily", "Outfit"),
                        fontWeight: getSafeStyle(aiPreviewBlueprint.styles, "details", "fontWeight", "normal") === "800" ? 800 : "bold",
                        fontStyle: getSafeStyle(aiPreviewBlueprint.styles, "details", "fontStyle", "normal"),
                        color: getSafeStyle(aiPreviewBlueprint.styles, "details", "color", "#ffffff") 
                      }}>{renderSafeString(aiPreviewBlueprint.date)}</div>
                      <div style={{ fontSize: "0.68rem", opacity: 0.8 }}>{renderSafeString(aiPreviewBlueprint.time)}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--primary)", textTransform: "uppercase" }}>Lieu</span>
                      <div style={{ 
                        fontSize: `${getSafeStyle(aiPreviewBlueprint.styles, "details", "fontSize", 12) - 1}px`, 
                        fontFamily: getSafeStyle(aiPreviewBlueprint.styles, "details", "fontFamily", "Outfit"),
                        color: getSafeStyle(aiPreviewBlueprint.styles, "details", "color", "#ffffff"),
                        lineHeight: 1.25 
                      }}>{renderSafeString(aiPreviewBlueprint.place, ", ")}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                      <span style={{ fontSize: "0.58rem", fontWeight: 700, letterSpacing: "0.5px", color: "var(--primary)", textTransform: "uppercase" }}>Tarif</span>
                      <div style={{ 
                        fontSize: `${getSafeStyle(aiPreviewBlueprint.styles, "details", "fontSize", 12)}px`, 
                        fontFamily: getSafeStyle(aiPreviewBlueprint.styles, "details", "fontFamily", "Outfit"),
                        fontWeight: "700", 
                        color: "#10b981" 
                      }}>{renderSafeString(aiPreviewBlueprint.price)}</div>
                    </div>
                  </div>
                </div>

                {/* 5. MULTIPLE UPLOADED FLOATING IMAGES */}
                {uploadedImages.map((img) => {
                  const imgPos = (aiPreviewBlueprint.positions && aiPreviewBlueprint.positions[`image_${img.id}`]) || { x: 55, y: 44 };
                  return (
                    <div 
                      key={img.id}
                      style={{
                        position: "absolute",
                        left: `${imgPos.x}%`,
                        top: `${imgPos.y}%`,
                        width: `${img.w}%`,
                        zIndex: 16
                      }}
                    >
                      <img 
                        src={img.src} 
                        alt="" 
                        style={{
                          width: "100%",
                          borderRadius: 12,
                          boxShadow: "0 8px 24px rgba(0,0,0,0.5)",
                          border: "1px solid rgba(255,255,255,0.15)",
                          display: "block"
                        }} 
                      />
                    </div>
                  );
                })}

                {/* 6. FOOTER / CONTACTS */}
                <div style={{
                  position: "absolute",
                  left: `${getSafePos(aiPreviewBlueprint.positions, "footer", { x: 4, y: 86 }).x}%`,
                  top: `${getSafePos(aiPreviewBlueprint.positions, "footer", { x: 4, y: 86 }).y}%`,
                  width: "92%",
                  zIndex: 20
                }}>
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: `${getSafeStyle(aiPreviewBlueprint.styles, "footer", "fontSize", 11)}px`,
                    fontFamily: getSafeStyle(aiPreviewBlueprint.styles, "footer", "fontFamily", "Outfit"),
                    fontWeight: getSafeStyle(aiPreviewBlueprint.styles, "footer", "fontWeight", "700") === "800" ? 800 : "bold",
                    fontStyle: getSafeStyle(aiPreviewBlueprint.styles, "footer", "fontStyle", "normal"),
                    color: getSafeStyle(aiPreviewBlueprint.styles, "footer", "color", "#10b981"),
                    textTransform: getSafeStyle(aiPreviewBlueprint.styles, "footer", "textTransform", "none"),
                    textDecoration: getSafeStyle(aiPreviewBlueprint.styles, "footer", "textDecoration", "none"),
                    borderTop: "1px solid rgba(255,255,255,0.18)",
                    paddingTop: 8
                  }}>
                    <div>
                      <strong>RÉSERVATIONS :</strong>
                      <div style={{ fontWeight: 600 }}>{renderSafeString(aiPreviewBlueprint.contact)}</div>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: "0.52rem", letterSpacing: "1px", textTransform: "uppercase" }}>
                      Mon Asso 2026
                    </div>
                  </div>
                </div>

              </div>

              {/* Floating Action Glass Toolbar */}
              <div style={{
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                gap: 10,
                background: "rgba(30, 41, 59, 0.8)",
                backdropFilter: "blur(20px)",
                border: "1px solid rgba(255, 255, 255, 0.1)",
                padding: "12px 18px",
                borderRadius: 20,
                boxShadow: "0 12px 30px rgba(0,0,0,0.4)",
                width: "100%"
              }}>
                <button 
                  onClick={() => downloadFlyerPdf(aiPreviewBlueprint, aiPreviewBlueprint.styles, aiPreviewBlueprint.positions)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 15px", borderRadius: 10, border: "none",
                    backgroundColor: "var(--primary)", color: "white", fontWeight: 700, fontSize: "0.8rem",
                    cursor: "pointer", transition: "transform 0.1s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                >
                  <Download size={14} /> PDF A4
                </button>
                <button 
                  onClick={() => downloadFlyerAsImage(aiPreviewBlueprint, aiPreviewBlueprint.styles, aiPreviewBlueprint.positions)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 15px", borderRadius: 10, border: "none",
                    backgroundColor: "#8b5cf6", color: "white", fontWeight: 700, fontSize: "0.8rem",
                    cursor: "pointer", transition: "transform 0.1s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                >
                  🖼️ Image PNG
                </button>
                <button 
                  onClick={handlePrintPreview}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 15px", borderRadius: 10, border: "none",
                    backgroundColor: "#10b981", color: "white", fontWeight: 700, fontSize: "0.8rem",
                    cursor: "pointer", transition: "transform 0.1s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                >
                  🖨️ Imprimer A4
                </button>
                <button 
                  onClick={handleApplyPreviewToWorkspace}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 15px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.15)",
                    backgroundColor: "rgba(255,255,255,0.06)", color: "white", fontWeight: 600, fontSize: "0.8rem",
                    cursor: "pointer", transition: "transform 0.1s ease"
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.03)"}
                  onMouseLeave={(e) => e.currentTarget.style.transform = "none"}
                >
                  ✏️ Modifier
                </button>
                <button 
                  onClick={() => setIsPreviewModalOpen(false)}
                  style={{
                    display: "flex", alignItems: "center", gap: 6,
                    padding: "9px 15px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.08)",
                    backgroundColor: "transparent", color: "#94a3b8", fontWeight: 600, fontSize: "0.8rem",
                    cursor: "pointer"
                  }}
                >
                  Fermer
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ── TAB 2: DIRECT DRIVE VAULT ──────────────────────────────────── */}
        {activeTab === "drive" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            
            {/* Google Drive Visualizer Panel (Full Width) */}
            <div className="admin-card" style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--border)", paddingBottom: 12, marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 8 }}>
                    <Eye size={18} style={{ color: "var(--success)" }} /> Visualiseur Google Drive
                  </h3>
                  <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", maxWidth: 200, display: "inline-block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selectedDriveFile ? `Visualisation de : ${selectedDriveFile.name}` : "Aperçu global du dossier partagé."}
                  </span>
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                  {selectedDriveFile && (
                    <button className="btn-ghost" onClick={() => setSelectedDriveFile(null)} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "auto" }}>
                      Retour au Dossier
                    </button>
                  )}
                  <button className="btn-ghost" onClick={() => setIsEditingEmbed(!isEditingEmbed)} style={{ padding: "4px 8px", fontSize: "0.75rem", minHeight: "auto" }}>
                    Dossier ID
                  </button>
                </div>
              </div>

              {isEditingEmbed || !driveEmbedUrl ? (
                <form onSubmit={handleSaveEmbedUrl} style={{ padding: "20px 0" }}>
                  <label className="form-label">Lien du dossier Google Drive</label>
                  <input 
                    type="url" className="form-input" placeholder="https://drive.google.com/drive/folders/..."
                    value={driveEmbedUrl} onChange={(e) => setDriveEmbedUrl(e.target.value)} required
                    style={{ marginBottom: 14 }}
                  />
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" className="btn-primary">Enregistrer</button>
                    {driveEmbedUrl && <button type="button" className="btn-ghost" onClick={() => setIsEditingEmbed(false)}>Annuler</button>}
                  </div>
                </form>
              ) : (
                <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 380 }}>
                  <iframe 
                    title="Google Drive Visualizer"
                    src={selectedDriveFile 
                      ? `https://drive.google.com/file/d/${selectedDriveFile.id}/preview`
                      : getDriveEmbedUrl(driveEmbedUrl)
                    } 
                    style={{ width: "100%", height: "100%", minHeight: 360, borderRadius: 12, border: "1px solid var(--border)", background: "#ffffff" }}
                    frameBorder="0"
                    allow="autoplay"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 3: SOCIAL MEDIA AI REVIEW ──────────────────────────────── */}
        {activeTab === "social" && (
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 24 }}>
            <div className="admin-card" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 10 }}>
                <h3 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-heading)", display: "flex", alignItems: "center", gap: 8 }}>
                  <Sparkles size={18} style={{ color: "var(--primary)" }} /> Rédacteur Social & AI Copilot
                </h3>
                <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Saisissez votre annonce brute, l'IA se charge de l'optimiser pour chaque réseau !</span>
              </div>

              <div>
                <label className="form-label">Votre message ou détails de l'événement</label>
                <textarea 
                  className="form-input" rows="4" 
                  value={socialInput} onChange={(e) => setSocialInput(e.target.value)}
                  placeholder="Décrivez votre annonce : date, lieu, tarif, etc."
                  style={{ resize: "vertical", fontFamily: "inherit", fontSize: "0.9rem" }}
                />
              </div>

              <button 
                className="btn-primary" onClick={handleSocialAiReview} disabled={isReviewingSocial}
                style={{ width: "100%", justifyContent: "center", height: 42 }}
              >
                <Sparkles size={16} className={isReviewingSocial ? "animate-spin" : ""} /> Optimiser la publication avec l'IA
              </button>

              {/* Outputs Tabs */}
              {socialOutputs.instagram && (
                <div style={{ marginTop: 10 }}>
                  <div style={{ display: "flex", gap: 8, borderBottom: "1px solid var(--border)", paddingBottom: 10, marginBottom: 12 }}>
                    {[
                      { id: "instagram", label: "Instagram", icon: Instagram },
                      { id: "facebook", label: "Facebook", icon: Facebook },
                      { id: "whatsapp", label: "WhatsApp", icon: MessageSquare },
                    ].map(p => {
                      const Icon = p.icon;
                      const active = socialPreviewPlatform === p.id;
                      return (
                        <button
                          key={p.id}
                          onClick={() => setSocialPreviewPlatform(p.id)}
                          style={{
                            background: active ? "var(--primary-light)" : "transparent",
                            border: active ? "1px solid var(--primary)" : "1px solid transparent",
                            color: active ? "var(--primary)" : "var(--text-muted)",
                            borderRadius: 8, padding: "6px 12px", fontSize: "0.78rem", cursor: "pointer",
                            display: "flex", alignItems: "center", gap: 6, fontWeight: 600
                          }}
                        >
                          <Icon size={14} /> {p.label}
                        </button>
                      );
                    })}
                  </div>

                  <div style={{ position: "relative" }}>
                    <textarea 
                      className="form-input" rows="8" readOnly 
                      value={socialOutputs[socialPreviewPlatform]}
                      style={{ fontSize: "0.85rem", background: "var(--bg-body)", lineHeight: 1.5, fontFamily: "monospace", paddingRight: 40 }}
                    />
                    <div style={{ position: "absolute", top: 10, right: 10, display: "flex", flexDirection: "column", gap: 6 }}>
                      <button 
                        className="btn-icon" style={{ width: 28, height: 28 }}
                        title="Copier le texte" onClick={() => handleCopyText(socialOutputs[socialPreviewPlatform])}
                      >
                        <Copy size={13} />
                      </button>
                      {socialPreviewPlatform === "whatsapp" && (
                        <button 
                          className="btn-icon" style={{ width: 28, height: 28, borderColor: "var(--success)", color: "var(--success)" }}
                          title="Envoyer sur WhatsApp" onClick={() => handleShareWhatsapp(socialOutputs.whatsapp)}
                        >
                          <Send size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Smartphone mockup preview */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--text-heading)", textTransform: "uppercase" }}>Visualisation Mobile</span>
                <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: "0.75rem", color: "var(--text-muted)" }}>
                  <Smartphone size={12} /> Aperçu du flux
                </span>
              </div>

              {/* Smartphone Mockup */}
              <div style={{
                width: "100%", maxWidth: 330, background: "#090d16",
                border: "12px solid #27272a", borderRadius: 40, padding: "20px 14px 14px",
                aspectRatio: "9/18", margin: "0 auto", position: "relative",
                display: "flex", flexDirection: "column", gap: 12, boxShadow: "var(--shadow-md)"
              }}>
                <div style={{ width: 60, height: 4, background: "#52525b", borderRadius: 2, margin: "-10px auto 10px" }} />

                <div style={{
                  flex: 1, background: socialPreviewPlatform === "whatsapp" ? "#0b141a" : "#ffffff",
                  borderRadius: 18, padding: 12, overflowY: "auto", color: socialPreviewPlatform === "whatsapp" ? "#e9edef" : "#000000",
                  fontSize: "0.78rem", scrollbarWidth: "none"
                }}>
                  {/* INSTAGRAM MOCK */}
                  {socialPreviewPlatform === "instagram" && (
                    <div style={{ color: "#262626" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "linear-gradient(135deg, #f59e0b, #ec4899)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.6rem", color: "white" }}>A</div>
                        <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>abl_lyon</span>
                      </div>
                      <div style={{
                        width: "100%", aspectRatio: "1", borderRadius: 6,
                        background: "linear-gradient(135deg, var(--primary), var(--accent))",
                        display: "grid", placeItems: "center", color: "white", fontWeight: 700, fontSize: "1.1rem",
                        marginBottom: 8
                      }}>
                        SOIRÉE ABL 🇧🇫
                      </div>
                      <div style={{ display: "flex", gap: 10, marginBottom: 6 }}>
                        <span style={{ color: "#ef4444", fontWeight: 700 }}>❤️ 12 likes</span>
                      </div>
                      <p style={{ margin: 0, fontSize: "0.72rem", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                        <strong>abl_lyon</strong> {socialOutputs.instagram || "Votre publication Instagram s'affichera ici..."}
                      </p>
                    </div>
                  )}

                  {/* FACEBOOK MOCK */}
                  {socialPreviewPlatform === "facebook" && (
                    <div style={{ color: "#1c1e21" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--primary)", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.6rem", color: "white" }}>A</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.75rem", color: "#1877f2" }}>Association des Burkinabè de Lyon</div>
                          <div style={{ fontSize: "0.6rem", color: "#65676b" }}>À l'instant · 🌐</div>
                        </div>
                      </div>
                      <p style={{ margin: "0 0 8px", fontSize: "0.72rem", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                        {socialOutputs.facebook || "Votre publication Facebook s'affichera ici..."}
                      </p>
                      <div style={{
                        width: "100%", height: 120,
                        background: "linear-gradient(135deg, #1e3a8a, #0d9488)",
                        borderRadius: 6, display: "grid", placeItems: "center", color: "white", fontWeight: 700
                      }}>
                        Burkina Faso & Lyon Solidarité 🤝
                      </div>
                    </div>
                  )}

                  {/* WHATSAPP MOCK */}
                  {socialPreviewPlatform === "whatsapp" && (
                    <div style={{ color: "#ffffff", display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, borderBottom: "1px solid #202c33", paddingBottom: 6 }}>
                        <div style={{ width: 24, height: 24, borderRadius: "50%", background: "#00a884", display: "grid", placeItems: "center", fontWeight: 800, fontSize: "0.6rem", color: "white" }}>ABL</div>
                        <span style={{ fontWeight: 700, fontSize: "0.75rem" }}>Groupe Officiel ABL</span>
                      </div>
                      <div style={{
                        alignSelf: "flex-start", background: "#202c33", borderRadius: 8,
                        padding: 10, maxWidth: "90%", position: "relative"
                      }}>
                        <div style={{ color: "#00a884", fontSize: "0.65rem", fontWeight: 700, marginBottom: 2 }}>Président ABL</div>
                        <p style={{ margin: 0, fontSize: "0.72rem", lineHeight: 1.4, whiteSpace: "pre-wrap", color: "#e9edef" }}>
                          {socialOutputs.whatsapp || "Votre message WhatsApp de diffusion s'affichera ici..."}
                        </p>
                        <div style={{ textAlign: "right", fontSize: "0.55rem", color: "#8696a0", marginTop: 4 }}>12:00</div>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ width: 80, height: 3, background: "#52525b", borderRadius: 1.5, margin: "4px auto 0" }} />
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: GOOGLE FORMS LIKE BUILDER ────────────────────────────── */}
        {activeTab === "forms" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 850, margin: "0 auto" }}>
            <div className="admin-card" style={{ padding: "28px 24px" }}>
              <div style={{ borderBottom: "1px solid var(--border)", paddingBottom: 16, marginBottom: 24, textAlign: "center" }}>
                <h3 style={{ fontSize: "1.25rem", fontWeight: 700, margin: "0 0 6px", color: "var(--text-heading)", display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
                  <ClipboardType size={24} style={{ color: "var(--primary)" }} /> Génération de Formulaires Libres
                </h3>
                <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: 0 }}>
                  Créez et gérez vos sondages, fiches d'adhésion, ou questionnaires d'événements à l'aide des meilleurs builders de formulaires gratuits en ligne.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {[
                  {
                    name: "Google Forms",
                    desc: "La solution classique de Google, 100% gratuite, sans limites, et directement connectée à vos feuilles de calcul Google Sheets pour stocker et analyser les réponses en temps réel.",
                    link: "https://docs.google.com/forms",
                    badge: "100% Gratuit & Illimité",
                    color: "var(--primary)"
                  },
                  {
                    name: "Tally.so",
                    desc: "Le générateur de formulaires le plus moderne et puissant. Il fonctionne comme Notion (création par commandes '/' en écrivant directement), sans limite de formulaires ou de réponses.",
                    link: "https://tally.so",
                    badge: "Populaire & Notion-style",
                    color: "var(--success)"
                  },
                  {
                    name: "Typeform",
                    desc: "Idéal pour concevoir des formulaires extrêmement soignés, dynamiques et interactifs qui s'affichent question par question pour un taux de réponse maximal.",
                    link: "https://www.typeform.com",
                    badge: "Design Ultra-Premium",
                    color: "var(--info)"
                  },
                  {
                    name: "Microsoft Forms",
                    desc: "Un builder très performant et intuitif, inclus gratuitement dans l'écosystème Microsoft 365, idéal si vous utilisez Outlook ou Excel.",
                    link: "https://forms.office.com",
                    badge: "Inclus dans Office 365",
                    color: "var(--warning)"
                  }
                ].map((item) => (
                  <div key={item.name} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center", gap: 20,
                    padding: 18, borderRadius: 12, background: "var(--bg-card)",
                    border: "1px solid var(--border)", transition: "transform 0.2s, border-color 0.2s",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.02)"
                  }}
                  className="form-link-card"
                  >
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <h4 style={{ fontSize: "1rem", fontWeight: 700, margin: 0, color: "var(--text-heading)" }}>{item.name}</h4>
                        <span style={{ fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: "rgba(99,102,241,0.08)", color: "var(--primary)" }}>{item.badge}</span>
                      </div>
                      <p style={{ fontSize: "0.82rem", color: "var(--text-muted)", margin: 0, lineHeight: 1.4 }}>{item.desc}</p>
                    </div>
                    <a href={item.link} target="_blank" rel="noreferrer" className="btn-primary" style={{ flexShrink: 0, textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px", fontSize: "0.82rem" }}>
                      Ouvrir le Builder <Share2 size={13} />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .draggable-flyer-item {
          transition: border-color 0.15s, box-shadow 0.15s;
          border: 1px dashed transparent;
          border-radius: 6px;
          padding: 4px;
        }
        .draggable-flyer-item:hover {
          border-color: rgba(99, 102, 241, 0.7);
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.35);
        }
        .draggable-flyer-item.selected {
          border: 2px dashed var(--primary) !important;
          box-shadow: 0 0 15px rgba(99, 102, 241, 0.5) !important;
        }
        .draggable-flyer-item .drag-handle-indicator {
          position: absolute;
          top: -18px;
          left: 0;
          background: var(--primary);
          color: white;
          font-size: 0.55rem;
          font-weight: 800;
          padding: 1px 6px;
          border-radius: 4px;
          opacity: 0;
          transition: opacity 0.15s;
          pointer-events: none;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          z-index: 40;
        }
        .draggable-flyer-item:hover .drag-handle-indicator {
          opacity: 0.95;
        }
      `}</style>
    </div>
  );
}
