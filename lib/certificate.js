import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import QRCode from "qrcode";

export async function generateCertificate(data) {
  try {
    const {
      employeeName,
      employeeAddress,
      totalAmountWei,
      paymentCount,
      fromDate,
      toDate,
      payments,
      contractAddress,
    } = data;

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([600, 800]);

    const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const courier = await pdfDoc.embedFont(StandardFonts.Courier);

    let yPosition = 750;

    page.drawText("PAYPROOF", {
      x: 50,
      y: yPosition,
      size: 28,
      font: helveticaBold,
      color: rgb(0.42, 0.28, 1),
    });

    yPosition -= 35;

    page.drawText("Blockchain Income Certificate", {
      x: 50,
      y: yPosition,
      size: 14,
      font: helvetica,
    });

    yPosition -= 20;

    page.drawText("Verified on Monad Network", {
      x: 50,
      y: yPosition,
      size: 11,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    yPosition -= 25;

    page.drawLine({
      start: { x: 50, y: yPosition },
      end: { x: 550, y: yPosition },
      thickness: 1,
      color: rgb(0.166, 0.166, 0.23),
    });

    yPosition -= 30;

    page.drawText("Issued to:", {
      x: 50,
      y: yPosition,
      size: 12,
      font: helveticaBold,
    });

    yPosition -= 18;

    const addrChunks = [];
    const addr = employeeAddress.toLowerCase();
    for (let i = 0; i < addr.length; i += 8) {
      addrChunks.push(addr.substring(i, i + 8));
    }

    addrChunks.forEach((chunk, idx) => {
      page.drawText(chunk, {
        x: 50 + idx * 70,
        y: yPosition,
        size: 9,
        font: courier,
        color: rgb(0.62, 0.54, 1),
      });
      if (idx > 0) {
        yPosition -= 16;
      }
    });

    yPosition -= 25;

    const totalMon = (parseFloat(totalAmountWei) / 1e18).toFixed(4);

    page.drawRectangle({
      x: 50,
      y: yPosition - 65,
      width: 500,
      height: 70,
      borderColor: rgb(0.166, 0.166, 0.23),
      borderWidth: 1,
    });

    const boxY = yPosition - 20;

    page.drawText("Total Received", {
      x: 80,
      y: boxY,
      size: 10,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText(`${totalMon} MON`, {
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

    page.drawText(paymentCount.toString(), {
      x: 250,
      y: boxY - 16,
      size: 16,
      font: helveticaBold,
      color: rgb(0.76, 0.48, 1),
    });

    page.drawText("Period", {
      x: 420,
      y: boxY,
      size: 10,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText(`${fromDate} – ${toDate}`, {
      x: 420,
      y: boxY - 16,
      size: 11,
      font: courier,
      color: rgb(0.88, 0.88, 0.94),
    });

    yPosition -= 85;

    page.drawText("Recent Payments", {
      x: 50,
      y: yPosition,
      size: 11,
      font: helveticaBold,
    });

    yPosition -= 18;

    const headerY = yPosition;
    page.drawText("Date", {
      x: 50,
      y: headerY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText("Amount (MON)", {
      x: 150,
      y: headerY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText("Employer", {
      x: 280,
      y: headerY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText("Block", {
      x: 470,
      y: headerY,
      size: 9,
      font: helveticaBold,
      color: rgb(0.53, 0.53, 0.53),
    });

    yPosition -= 14;

    const recentPayments = payments
      .sort((a, b) => Number(b.timestamp) - Number(a.timestamp))
      .slice(0, 10);

    recentPayments.forEach((payment) => {
      const paymentDate = new Date(
        Number(payment.timestamp) * 1000,
      ).toLocaleDateString();
      const paymentAmountMon = (parseFloat(payment.amount) / 1e18).toFixed(4);
      const employerShort =
        payment.employer.substring(0, 6) +
        "..." +
        payment.employer.substring(38);

      page.drawText(paymentDate, {
        x: 50,
        y: yPosition,
        size: 8,
        font: courier,
        color: rgb(0.88, 0.88, 0.94),
      });

      page.drawText(paymentAmountMon, {
        x: 150,
        y: yPosition,
        size: 8,
        font: courier,
        color: rgb(0.76, 0.48, 1),
      });

      page.drawText(employerShort, {
        x: 280,
        y: yPosition,
        size: 8,
        font: courier,
        color: rgb(0.62, 0.54, 1),
      });

      page.drawText(payment.blockNumber.toString(), {
        x: 470,
        y: yPosition,
        size: 8,
        font: courier,
        color: rgb(0.88, 0.88, 0.94),
      });

      yPosition -= 14;
    });

    yPosition -= 20;

    if (typeof window === "undefined" || Buffer !== undefined) {
      try {
        const qrUrl = `https://testnet.monadexplorer.com/address/${employeeAddress}`;
        const qrBuffer = await QRCode.toBuffer(qrUrl, {
          width: 120,
          margin: 0,
          type: "image/png",
          color: {
            dark: "#000000",
            light: "#ffffff",
          },
        });

        const qrEmbedded = await pdfDoc.embedPng(qrBuffer);

        page.drawImage(qrEmbedded, {
          x: 480,
          y: yPosition - 120,
          width: 100,
          height: 100,
        });
      } catch (qrErr) {
        console.warn("QR code generation failed:", qrErr);
      }
    } else {
      try {
        const qrUrl = `https://testnet.monadexplorer.com/address/${employeeAddress}`;
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
          y: yPosition - 120,
          width: 100,
          height: 100,
        });
      } catch (qrErr) {
        console.warn("QR code generation failed in browser:", qrErr);
      }
    }

    yPosition -= 140;

    page.drawText("Certificate ID:", {
      x: 50,
      y: yPosition,
      size: 8,
      font: courier,
      color: rgb(0.53, 0.53, 0.53),
    });

    const certId = `${employeeAddress.slice(0, 8)}-${Date.now()}`;

    page.drawText(certId, {
      x: 50,
      y: yPosition - 12,
      size: 8,
      font: courier,
      color: rgb(0.62, 0.54, 1),
    });

    page.drawText("Scan QR to verify on Monad Explorer", {
      x: 50,
      y: yPosition - 28,
      size: 8,
      font: helvetica,
      color: rgb(0.53, 0.53, 0.53),
    });

    page.drawText("Generated by PayProof — payproof.xyz", {
      x: 50,
      y: yPosition - 44,
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
    alert("PDF generation failed: " + error.message);
  }
}
