import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";
import { accountExplorerUrl } from "@/lib/stellar";

function formatXlm(value) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) {
    return "0.0000000";
  }

  return num.toFixed(7);
}

function shortAddress(address) {
  if (!address || address.length < 12) {
    return address || "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export async function generateCertificate(data) {
  try {
    const {
      employeeName,
      employeeAddress,
      totalAmountXlm,
      paymentCount,
      fromDate,
      toDate,
      payments,
    } = data;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);

    let y = 750;

    page.drawText("PAYPROOF", {
      x: 50,
      y,
      size: 28,
      font: helveticaBold,
      color: rgb(0.42, 0.28, 1),
    });

    y -= 35;
    page.drawText("Stellar Income Certificate", {
      x: 50,
      y,
      size: 14,
      font: helvetica,
    });

    y -= 20;
    page.drawText("Verified on Stellar Testnet", {
      x: 50,
      y,
      size: 11,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    y -= 25;
    page.drawLine({
      start: { x: 50, y },
      end: { x: 550, y },
      thickness: 1,
      color: rgb(0.166, 0.166, 0.23),
    });

    y -= 32;
    page.drawText("Issued To", {
      x: 50,
      y,
      size: 12,
      font: helveticaBold,
    });

    y -= 18;
    page.drawText(employeeName || shortAddress(employeeAddress), {
      x: 50,
      y,
      size: 12,
      font: helvetica,
      color: rgb(0.88, 0.88, 0.94),
    });

    y -= 16;
    page.drawText(employeeAddress, {
      x: 50,
      y,
      size: 9,
      font: courier,
      color: rgb(0.62, 0.54, 1),
    });

    y -= 24;
    page.drawRectangle({
      x: 50,
      y: y - 66,
      width: 500,
      height: 72,
      borderColor: rgb(0.166, 0.166, 0.23),
      borderWidth: 1,
    });

    const boxY = y - 20;

    page.drawText("Total Received", {
      x: 80,
      y: boxY,
      size: 10,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText(`${formatXlm(totalAmountXlm)} XLM`, {
      x: 80,
      y: boxY - 16,
      size: 16,
      font: helveticaBold,
      color: rgb(0.42, 0.28, 1),
    });

    page.drawText("Payment Count", {
      x: 250,
      y: boxY,
      size: 10,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText(String(paymentCount || 0), {
      x: 250,
      y: boxY - 16,
      size: 16,
      font: helveticaBold,
      color: rgb(0.76, 0.48, 1),
    });

    page.drawText("Period", {
      x: 380,
      y: boxY,
      size: 10,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText(`${fromDate} - ${toDate}`, {
      x: 380,
      y: boxY - 16,
      size: 10,
      font: courier,
      color: rgb(0.88, 0.88, 0.94),
    });

    y -= 92;
    page.drawText("Recent Payments", {
      x: 50,
      y,
      size: 11,
      font: helveticaBold,
    });

    y -= 18;
    page.drawText("Date", {
      x: 50,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });
    page.drawText("Amount (XLM)", {
      x: 160,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });
    page.drawText("From", {
      x: 290,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });
    page.drawText("Ledger", {
      x: 470,
      y,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });

    y -= 14;

    const recent = [...(payments || [])]
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 10);

    recent.forEach((payment) => {
      const date = new Date(
        Number(payment.timestamp) * 1000,
      ).toLocaleDateString();
      const amountText = formatXlm(payment.amountXlm);
      const fromText = shortAddress(payment.employer || "");

      page.drawText(date, {
        x: 50,
        y,
        size: 8,
        font: courier,
        color: rgb(0.88, 0.88, 0.94),
      });
      page.drawText(amountText, {
        x: 160,
        y,
        size: 8,
        font: courier,
        color: rgb(0.76, 0.48, 1),
      });
      page.drawText(fromText, {
        x: 290,
        y,
        size: 8,
        font: courier,
        color: rgb(0.62, 0.54, 1),
      });
      page.drawText(String(payment.ledger || "-"), {
        x: 470,
        y,
        size: 8,
        font: courier,
        color: rgb(0.88, 0.88, 0.94),
      });

      y -= 14;
    });

    y -= 24;

    try {
      const qrUrl = accountExplorerUrl(employeeAddress);
      const qrDataUrl = await QRCode.toDataURL(qrUrl, {
        width: 120,
        margin: 0,
        type: "image/png",
        color: {
          dark: "#000000",
          light: "#ffffff",
        },
      });

      const base64String = qrDataUrl.split(",")[1];
      const uint8Array = Uint8Array.from(atob(base64String), (c) =>
        c.charCodeAt(0),
      );
      const qrEmbedded = await pdfDoc.embedPng(uint8Array);

      page.drawImage(qrEmbedded, {
        x: 480,
        y: y - 108,
        width: 90,
        height: 90,
      });

      page.drawText("Scan to verify account", {
        x: 452,
        y: y - 122,
        size: 8,
        font: helvetica,
        color: rgb(0.53, 0.53, 0.53),
      });
    } catch {
      // Ignore QR generation errors and continue saving the certificate.
    }

    page.drawText("Certificate ID", {
      x: 50,
      y: y - 20,
      size: 8,
      font: courier,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText(`${employeeAddress.slice(0, 8)}-${Date.now()}`, {
      x: 50,
      y: y - 32,
      size: 8,
      font: courier,
      color: rgb(0.62, 0.54, 1),
    });

    page.drawText("Generated by PayProof", {
      x: 50,
      y: y - 46,
      size: 8,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    const pdfDataUri = await pdfDoc.saveAsBase64({ dataUri: true });
    const link = document.createElement("a");
    link.href = pdfDataUri;
    link.download = `PayProof_${employeeAddress.slice(0, 8)}_${toDate}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Certificate generation error:", error);
    alert(`PDF generation failed: ${error.message}`);
  }
}
