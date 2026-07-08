import { jsPDF } from "jspdf";

// ABL Association constants
const ABL = {
    name: "Association des Burkinabè de Lyon (ABL)",
    address: "22 Rue Alfred de Musset",
    city: "69100 Villeurbanne",
    siret: "SIRET 530 720 952",
    recepisse: "Récépissé n° W69 1060594 du 09/06/05",
    rue: "39, rue Georges Courteline",
};

// ─── Image loader helpers ─────────────────────────────────────────────────────

/**
 * Loads an image from a public URL and returns it as a base64 data URL.
 * Uses a canvas to handle cross-format conversion.
 */
function loadImageAsBase64(url) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width  = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/png"));
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
        img.src = url + "?t=" + Date.now(); // cache-bust to avoid stale image
    });
}

// ─── Main export ──────────────────────────────────────────────────────────────

/**
 * Generates the member card PDF with real images.
 * Returns the jsPDF instance after drawing both pages.
 *
 * @param {Object} member  - Member data from Firestore
 * @param {string} logoB64   - base64 logo image
 * @param {string} backB64   - base64 back (Lyon) image
 * @param {string|null} tamponB64 - base64 tampon image (may be null)
 * @returns {jsPDF}
 */
function buildPDF(member, logoB64, backB64, tamponB64) {
    const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: "a6",   // 148 × 105 mm
    });

    const W = 148;
    const H = 105;

    drawFront(pdf, member, W, H, logoB64, tamponB64);
    pdf.addPage();
    drawBack(pdf, member, W, H, backB64);

    return pdf;
}

// ─── FRONT ────────────────────────────────────────────────────────────────────
function drawFront(pdf, member, W, H, logoB64, tamponB64) {
    // Outer border
    pdf.setDrawColor(0, 51, 153);
    pdf.setLineWidth(0.8);
    pdf.rect(4, 4, W - 8, H - 8);

    // Blue header band
    pdf.setFillColor(0, 51, 153);
    pdf.rect(4, 4, W - 8, 16, "F");

    // ── Logo (top-left of header) ──────────────────────────────────────────
    if (logoB64) {
        // White circle background for logo
        pdf.setFillColor(255, 255, 255);
        pdf.circle(14, 12, 6, "F");
        pdf.addImage(logoB64, "JPEG", 8.5, 6.5, 11, 11);
    }

    // Association name in header
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(8.5);
    pdf.setFont("helvetica", "bold");
    pdf.text(ABL.name, W / 2 + 4, 10, { align: "center" });

    // Year (top-right of header)
    const year = new Date().getFullYear();
    pdf.setFontSize(8.5);
    pdf.text(`Année ${year}`, W - 7, 10, { align: "right" });

    // ── Title ──────────────────────────────────────────────────────────────
    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(13);
    pdf.setFont("helvetica", "bold");
    pdf.text("CARTE DE MEMBRE", W / 2, 29, { align: "center" });

    // Thin separator line
    pdf.setDrawColor(0, 51, 153);
    pdf.setLineWidth(0.4);
    pdf.line(20, 32, W - 20, 32);

    // ── Fields ─────────────────────────────────────────────────────────────
    const labelX = 10;
    const valueX = 50;
    let y = 39;
    const lineH = 7.5;

    const fields = [
        { label: "Numéro adhérent :", value: member.memberNumber || "—", color: [0, 102, 204] },
        { label: "Nom :",             value: (member.lastname  || "").toUpperCase() },
        { label: "Prénom :",          value: member.firstname  || "" },
        { label: "Adresse :",         value: member.address    || "" },
        { label: "Profession :",      value: member.profession || "" },
    ];

    fields.forEach(({ label, value, color }) => {
        pdf.setFont("helvetica", "bold");
        pdf.setFontSize(9);
        pdf.setTextColor(0, 0, 0);
        pdf.text(label, labelX, y);

        pdf.setFont("helvetica", "normal");
        pdf.setTextColor(...(color || [30, 30, 30]));
        const lines = pdf.splitTextToSize(value, W - valueX - 14);
        pdf.text(lines, valueX, y);
        y += lineH * Math.max(lines.length, 1);
    });

    // ── Signature line ─────────────────────────────────────────────────────
    const sigY = H - 18;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.text("Signature :", labelX, sigY);
    pdf.setDrawColor(160, 160, 160);
    pdf.setLineWidth(0.25);
    pdf.line(labelX + 24, sigY + 1, labelX + 68, sigY + 1);

    // ── Cachet / Tampon (right side) ───────────────────────────────────────
    const cachetX = W - 55;
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(9);
    pdf.setTextColor(0, 0, 0);
    pdf.text("Cachet :", cachetX, sigY);

    if (tamponB64) {
        // Embed the real tampon image
        pdf.addImage(tamponB64, "PNG", cachetX - 2, sigY + 2, 46, 14);
    } else {
        // Fallback text cachet
        pdf.setFontSize(7);
        pdf.setFont("helvetica", "bold");
        pdf.setTextColor(60, 60, 60);
        const cachetLines = [
            "ABL",
            "Association des Burkinabé de Lyon",
            ABL.recepisse,
            ABL.rue,
            ABL.city,
            ABL.siret,
        ];
        let cy = sigY + 5;
        cachetLines.forEach((line) => {
            pdf.setFont("helvetica", line === "ABL" ? "bold" : "normal");
            pdf.text(line, cachetX, cy);
            cy += 3.5;
        });
    }
}

// ─── BACK ─────────────────────────────────────────────────────────────────────
function drawBack(pdf, member, W, H, backB64) {
    // Outer border
    pdf.setDrawColor(0, 51, 153);
    pdf.setLineWidth(0.8);
    pdf.rect(4, 4, W - 8, H - 8);

    // ── Lyon photo ────────────────────────────────────────────────────────
    if (backB64) {
        // Full-width photo at the top (with slight padding from border)
        pdf.addImage(backB64, "JPEG", 5, 5, W - 10, 52);
    } else {
        // Fallback gradient placeholder
        pdf.setFillColor(100, 160, 210);
        pdf.rect(5, 5, W - 10, 52, "F");
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(9);
        pdf.text("Lyon — Place Bellecour", W / 2, 32, { align: "center" });
    }

    // ── Bottom association info ────────────────────────────────────────────
    const bottomY = 67;
    pdf.setTextColor(0, 0, 0);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(10);
    pdf.text(ABL.name, W / 2, bottomY, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(9.5);
    pdf.text(ABL.address, W / 2, bottomY + 8, { align: "center" });
    pdf.text(ABL.city, W / 2, bottomY + 15, { align: "center" });

    if (member.joinDate) {
        const dateStr = new Date(member.joinDate).toLocaleDateString("fr-FR");
        pdf.setFontSize(7.5);
        pdf.setTextColor(100, 100, 100);
        pdf.text(`Membre depuis le ${dateStr}`, W / 2, bottomY + 24, { align: "center" });
    }
}

// ─── Public API ───────────────────────────────────────────────────────────────

const BASE = process.env.PUBLIC_URL || "";

/**
 * Generates the member card PDF with real images loaded from public/assets/images/.
 * @param {Object} member
 * @returns {Promise<jsPDF>}
 */
export async function generateMemberCardPDF(member) {
    const [logoB64, backB64, tamponB64] = await Promise.all([
        loadImageAsBase64(`${BASE}/assets/images/logo.jpg`).catch(() => null),
        loadImageAsBase64(`${BASE}/assets/images/back.jpg`).catch(() => null),
        loadImageAsBase64(`${BASE}/assets/images/tempon.png`).catch(() => null),
    ]);

    return buildPDF(member, logoB64, backB64, tamponB64);
}

/**
 * Triggers a browser download of the member card PDF.
 * @param {Object} member
 */
export async function downloadMemberCard(member) {
    const pdf = await generateMemberCardPDF(member);
    const filename = `carte_membre_${member.memberNumber || member.lastname}_ABL.pdf`;
    pdf.save(filename);
}

/**
 * Returns the PDF as a base64 data URI string (for email attachments).
 * @param {Object} member
 * @returns {Promise<string>}
 */
export async function getMemberCardBase64(member) {
    const pdf = await generateMemberCardPDF(member);
    return pdf.output("datauristring");
}
