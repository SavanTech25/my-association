import { jsPDF } from "jspdf";
import moment from "moment";

const ABL = {
    name: "Association des Burkinabè de Lyon",
    address: "28 Rue Alfred de Musset, 69100 Villeurbanne",
    rna: "N° RNA : W691060594",
    email: "abllyon@yahoo.fr",
    phone: "06 64 24 14 66"
};

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
        img.onerror = () => resolve(null);
        img.src = url + "?t=" + Date.now();
    });
}

export async function generateReceiptPDF(member) {
    const logoB64 = await loadImageAsBase64((process.env.PUBLIC_URL || "") + "/assets/images/logo.jpg");

    const pdf = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const W = 210;
    const H = 297;

    // Header box
    pdf.setDrawColor(0, 0, 0);
    pdf.setLineWidth(0.5);
    pdf.rect(15, 15, W - 30, 40); // Top Box

    // Header Text
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text(ABL.name, W / 2, 22, { align: "center" });

    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(11);
    pdf.text(ABL.address, W / 2, 29, { align: "center" });
    pdf.text(ABL.rna, W / 2, 36, { align: "center" });
    
    pdf.setTextColor(0, 102, 204);
    pdf.text(ABL.email, W / 2, 43, { align: "center" });
    pdf.setTextColor(0, 0, 0);
    pdf.text(ABL.phone, W / 2, 50, { align: "center" });

    // Logo
    if (logoB64) {
        // approximate position on the right of the header
        pdf.addImage(logoB64, "JPEG", W - 45, 17, 28, 28);
    }
    
    // Vertical separator in header for logo
    pdf.line(W - 48, 15, W - 48, 55);

    // Title Box
    pdf.setFillColor(180, 200, 230); // light blue
    pdf.rect(15, 60, W - 30, 8, "DF");
    
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("Attestation de paiement", 18, 66);
    pdf.text(`N°${Date.now()}`, W - 18, 66, { align: "right" });

    // Date
    pdf.setDrawColor(0, 0, 0);
    pdf.rect(15, 75, 90, 6);
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(11);
    pdf.text("Date :", 18, 79.5);
    pdf.setFont("helvetica", "normal");
    const formattedDate = moment().format("DD/MM/YYYY");
    pdf.text(formattedDate, 50, 79.5);

    // Member Info Box
    pdf.rect(15, 90, 90, 28);
    
    let y = 96;
    pdf.setFont("helvetica", "bold");
    pdf.text("Nom", 32, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text(`${(member.lastname || "").toUpperCase()} ${member.firstname || ""}`, 34, y);
    
    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Adresse", 32, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text(member.address || "", 34, y);

    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("Code postal, Pays", 32, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text("Villeurbanne", 34, y); // You can modify this based on actual data if available

    y += 6;
    pdf.setFont("helvetica", "bold");
    pdf.text("E-mail", 32, y, { align: "right" });
    pdf.setFont("helvetica", "normal");
    pdf.text(member.email || "", 34, y);

    // Table
    const tableY = 135;
    const colWidths = [100, 25, 30, 25];
    const headers = ["Description", "Quantité", "Prix Unitaire", "Prix Total"];
    
    // Table Header
    pdf.setFillColor(180, 200, 230);
    pdf.rect(15, tableY, W - 30, 10, "DF");
    
    let currentX = 15;
    pdf.setFont("helvetica", "bold");
    headers.forEach((h, i) => {
        pdf.text(h, currentX + colWidths[i] / 2, tableY + 6.5, { align: "center" });
        pdf.line(currentX, tableY, currentX, tableY + 70); // vertical lines (table body)
        currentX += colWidths[i];
    });
    pdf.line(W - 15, tableY, W - 15, tableY + 70); // last vertical line

    // Table Body
    const year = new Date().getFullYear();
    const isDonation = false; 
    const amount = parseFloat(member.amount || "0");
    const amountStr = amount.toFixed(2) + " €";

    pdf.setFont("helvetica", "normal");
    pdf.text(`Cotisation annuelle de membre pour l'année ${year} au Tarif standard`, 18, tableY + 18, { maxWidth: 90 });
    pdf.text("1", 115 + 25/2, tableY + 18, { align: "center" });
    pdf.text(amountStr, 140 + 30/2, tableY + 18, { align: "center" });
    pdf.text(amountStr, 170 + 25/2, tableY + 18, { align: "center" });

    pdf.text("Don", 18, tableY + 28);
    pdf.text("1", 115 + 25/2, tableY + 28, { align: "center" });
    pdf.text("0.00 €", 140 + 30/2, tableY + 28, { align: "center" });
    pdf.text("0.00 €", 170 + 25/2, tableY + 28, { align: "center" });

    pdf.line(15, tableY + 70, W - 15, tableY + 70); // bottom line of table

    // Payment Info & Total
    const totalY = tableY + 80;
    
    // Left Box (Payment method)
    pdf.rect(15, totalY, 100, 35);
    pdf.setFont("helvetica", "bold");
    pdf.text("Moyen de paiement :", 15 + 50, totalY + 6, { align: "center" });
    pdf.line(15, totalY + 8, 115, totalY + 8);
    pdf.setFont("helvetica", "normal");
    pdf.text(member.paymentMethod || "Espèce", 15 + 50, totalY + 22, { align: "center" });

    // Right Box (Total)
    pdf.setFillColor(180, 200, 230);
    pdf.rect(115, totalY, 80, 35, "DF");
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(14);
    pdf.text("TOTAL TTC", 140, totalY + 20, { align: "center" });
    pdf.text(amountStr, 175, totalY + 20, { align: "center" });

    return pdf;
}

export async function downloadReceipt(member) {
    const pdf = await generateReceiptPDF(member);
    const filename = `attestation_paiement_${member.lastname}_${Date.now()}.pdf`;
    pdf.save(filename);
}

export async function getReceiptBase64(member) {
    const pdf = await generateReceiptPDF(member);
    return pdf.output("datauristring");
}

export async function downloadFinanceReceipt(financeData) {
    const logoB64 = await loadImageAsBase64((process.env.PUBLIC_URL || "") + "/assets/images/logo.jpg");
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const W = 210, H = 297;

    pdf.setDrawColor(0, 0, 0); pdf.setLineWidth(0.5); pdf.rect(15, 15, W - 30, 40);
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14); pdf.text(ABL.name, W / 2, 22, { align: "center" });
    pdf.setFont("helvetica", "normal"); pdf.setFontSize(11);
    pdf.text(ABL.address, W / 2, 29, { align: "center" });
    pdf.text(ABL.rna, W / 2, 36, { align: "center" });
    pdf.setTextColor(0, 102, 204); pdf.text(ABL.email, W / 2, 43, { align: "center" });
    pdf.setTextColor(0, 0, 0); pdf.text(ABL.phone, W / 2, 50, { align: "center" });
    if (logoB64) pdf.addImage(logoB64, "JPEG", W - 45, 17, 28, 28);
    pdf.line(W - 48, 15, W - 48, 55);

    pdf.setFillColor(180, 200, 230); pdf.rect(15, 60, W - 30, 8, "DF");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text("Reçu de trésorerie", 18, 66);
    pdf.text(`N°${financeData.id || Date.now()}`, W - 18, 66, { align: "right" });

    pdf.rect(15, 75, 90, 6);
    pdf.setFontSize(11); pdf.text("Date :", 18, 79.5);
    pdf.setFont("helvetica", "normal");
    const date = financeData.date ? moment(financeData.date).format("DD/MM/YYYY") : moment().format("DD/MM/YYYY");
    pdf.text(date, 50, 79.5);

    pdf.rect(15, 90, 90, 15);
    pdf.setFont("helvetica", "bold"); pdf.text("Détails", 32, 96, { align: "right" });
    pdf.setFont("helvetica", "normal"); pdf.text(financeData.title || "", 34, 96);

    const tableY = 115;
    pdf.setFillColor(180, 200, 230); pdf.rect(15, tableY, W - 30, 10, "DF");
    pdf.setFont("helvetica", "bold");
    pdf.text("Description", 65, tableY + 6.5, { align: "center" });
    pdf.text("Catégorie", 137.5, tableY + 6.5, { align: "center" });
    pdf.text("Montant", 182.5, tableY + 6.5, { align: "center" });
    pdf.line(115, tableY, 115, tableY + 30);
    pdf.line(160, tableY, 160, tableY + 30);
    pdf.line(W - 15, tableY, W - 15, tableY + 30);
    pdf.line(15, tableY, 15, tableY + 30);

    pdf.setFont("helvetica", "normal");
    pdf.text(financeData.title || "Transaction", 18, tableY + 18, { maxWidth: 90 });
    pdf.text(financeData.category || "-", 137.5, tableY + 18, { align: "center" });
    const amountStr = parseFloat(financeData.amount || "0").toFixed(2) + " €";
    pdf.text(amountStr, 182.5, tableY + 18, { align: "center" });
    pdf.line(15, tableY + 30, W - 15, tableY + 30);

    const totalY = tableY + 40;
    pdf.rect(15, totalY, 100, 35);
    pdf.setFont("helvetica", "bold"); pdf.text("Type :", 65, totalY + 6, { align: "center" });
    pdf.line(15, totalY + 8, 115, totalY + 8);
    pdf.setFont("helvetica", "normal"); 
    const typeLabel = financeData.type === 'income' ? 'Revenu' : 'Dépense';
    pdf.text(typeLabel, 65, totalY + 22, { align: "center" });

    pdf.setFillColor(180, 200, 230); pdf.rect(115, totalY, 80, 35, "DF");
    pdf.setFont("helvetica", "bold"); pdf.setFontSize(14);
    pdf.text("TOTAL TTC", 140, totalY + 20, { align: "center" });
    pdf.text(amountStr, 175, totalY + 20, { align: "center" });

    pdf.save(`recu_tresorerie_${financeData.id || Date.now()}.pdf`);
}
