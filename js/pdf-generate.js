function toDataURL(src, outputWidth = 100, outputHeight = 100) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'Anonymous';
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = outputWidth;
      canvas.height = outputHeight;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(image, 0, 0, outputWidth, outputHeight);
      // Use JPEG and set quality to 0.7
      resolve(canvas.toDataURL('image/jpeg', 0.9));
    };
    image.onerror = reject;
    image.src = src;
  });
}


async function generateInvoicePDF(formData, paymentResponse) {
  const amt_map = {
    1000: "One Thousand",
    1500: "One Thousand Five Hundred",
    2000: "Two Thousand",
    2500: "Two Thousand Five Hundred",
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const date = new Date().toLocaleDateString("en-IN");
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Colors
  const primaryColor = '#f5d225';
  const secondaryColor = '#97bc62';
  const accentColor = '#004b23';
  const lightColor = '#f8f9fa';
  const borderColor = '#e0e0e0';

  // === Load local image ===
  const logoDataUrl = await toDataURL('../assets/Logo-02.png'); // ✅ Relative to your HTML file

  // === Header Background ===
  doc.setFillColor(primaryColor);
  doc.rect(0, 0, pageWidth, 45, 'F');

  // === Draw Logo Centered ===
  const imgWidth = 30;
  const imgHeight = 30;
  const x = (pageWidth - imgWidth) / 2;
  doc.addImage(logoDataUrl, 'JPEG', x, 5, imgWidth, imgHeight);

  // === Invoice Title Below Logo ===
  doc.setFontSize(14);
  doc.setTextColor(44, 95, 45);
  doc.setFont("helvetica", "bold");
  doc.text(`${paymentResponse.source} Application`, pageWidth / 2, 38, { align: 'center' });

  // Date and invoice number
  doc.setFontSize(10);
  doc.text(`Date: ${date}`, pageWidth - margin, 50, { align: 'right' });
  doc.text(`Registration: ${paymentResponse.reg}`, margin, 50);


  // === Applicant Information Section ===
  const sectionHeader = (text, y) => {
    doc.setFillColor(lightColor);
    doc.rect(margin, y, pageWidth - margin * 2, 8, 'F');
    doc.setFontSize(11);
    doc.setTextColor(primaryColor);
    doc.setFont("helvetica", "bold");
    doc.text(text, margin + 5, y + 6);
  };

  let yPos = 65;
  sectionHeader("APPLICANT INFORMATION", yPos);
  yPos += 12;

  const applicantDetails = [
    { label: "Full Name:", value: formData.fullName },
    { label: "Father/Husband's Name:", value: formData.fatherName },
    { label: "Contact Number:", value: formData.phone },
    { label: "Email Address:", value: formData.email },
    { label: "Address:", value: formData.address }
  ];


  // Draw details with alternating row colors
  applicantDetails.forEach((item, index) => {
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos - 2, pageWidth - margin * 2, 10, 'F');
    }

    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.setFont("helvetica", "bold");
    doc.text(item.label, margin + 5, yPos + 3);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.text(doc.splitTextToSize(item.value, pageWidth - margin * 2), margin + 50, yPos + 3);

    yPos += 10;
  });

  // === Payment Details Section ===
  yPos += 8;
  sectionHeader("PAYMENT DETAILS", yPos);
  yPos += 12;

  const paymentDetails = [
    { label: "Transaction ID:", value: paymentResponse.razorpay_payment_id },
    { label: "Order ID:", value: paymentResponse.razorpay_order_id },
    { label: "Amount Paid:", value: `${paymentResponse.amount}` },
    { label: "Payment Method:", value: "Online (Razorpay)" },
    { label: "Payment Date:", value: date }
  ];

  // Draw payment details
  // Adjust layout for wrapped text
  const labelX = margin + 5;
  const valueX = margin + 50;
  const availableValueWidth = pageWidth - valueX - margin;
  const lineHeight = 5;

  applicantDetails.forEach((item, index) => {
    const valueLines = doc.splitTextToSize(item.value ?? '', availableValueWidth);
    const linesCount = valueLines.length;
    const rowHeight = Math.max(linesCount * lineHeight, 10);

    // Draw alternating background
    if (index % 2 === 0) {
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, yPos - 2, pageWidth - margin * 2, rowHeight, 'F');
    }

    // Draw label
    doc.setFontSize(10);
    doc.setTextColor(80);
    doc.setFont("helvetica", "bold");
    doc.text(item.label, labelX, yPos + 3);

    // Draw value (wrapped)
    doc.setFont("helvetica", "normal");
    doc.setTextColor(50);
    doc.text(valueLines, valueX, yPos + 3);

    yPos += rowHeight;
  });


  // === Payment Status Badge ===
  yPos += 8;
  doc.setFillColor('#e8f5e9'); // Light green background
  doc.rect(pageWidth - 60, yPos, 50, 12, 'F');
  doc.setDrawColor(secondaryColor);
  doc.setLineWidth(0.3);
  doc.rect(pageWidth - 60, yPos, 50, 12, 'S');

  doc.setFontSize(10);
  doc.setTextColor('#2e7d32');
  doc.setFont("helvetica", "bold");
  doc.text("PAID", pageWidth - 35, yPos + 8, { align: 'center' });

  // === Amount Summary ===
  yPos += 25;
  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.3);
  doc.line(pageWidth - 80, yPos, pageWidth - margin, yPos);

  doc.setFontSize(12);
  doc.setTextColor(primaryColor);
  doc.setFont("helvetica", "bold");
  doc.text("Total Amount:", pageWidth - 80, yPos + 8);
  doc.text(`${paymentResponse.amount}`, pageWidth - margin, yPos + 8, { align: 'right' });

  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`(${amt_map[paymentResponse.amount]} Rupees Only)`, pageWidth - margin, yPos + 14, { align: 'right' });

  // === Thank You Message ===
  yPos += 20;
  doc.setFontSize(11);
  doc.setTextColor(accentColor);
  doc.setFont("helvetica", "bolditalic");
  doc.text("Thank you for choosing pasuseva", pageWidth / 2, yPos, { align: 'center' });

  // === Authorization & Footer ===
  const footerY = doc.internal.pageSize.getHeight() - 25;

  doc.setDrawColor(borderColor);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY - 15, pageWidth - margin, footerY - 15);

  doc.setFontSize(8);
  doc.setTextColor(120);
  doc.setFont("helvetica", "normal");
  doc.text("This is a computer-generated invoice and does not require a physical signature.",
    pageWidth / 2, footerY - 10, { align: 'center' });
  doc.text("Application Fees is non-refundable", pageWidth / 2, footerY - 5, { align: 'center' });

  doc.setFont("helvetica", "bold");
  doc.text("Authorized Signatory", pageWidth - margin - 5, footerY, { align: "right" });

  // Organization info
  doc.setFontSize(8);
  doc.setTextColor(150);
  doc.text("Pasuseva • support@pasuseva.in • www.pasuseva.in",
    pageWidth / 2, footerY + 5, { align: 'center' });
  doc.text("Shiksha Gravity Foundation Parent Company Of Pasuseva", pageWidth / 2, yPos + 35, { align: 'center' });
  doc.text("Registered under Section 8 of Companies Act, 2013", pageWidth / 2, yPos + 40, { align: 'center' });

  // === Watermark ===
  doc.setGState(new doc.GState({ opacity: 0.1 }));
  doc.setFontSize(60);
  doc.setTextColor(accentColor);
  doc.setFont("helvetica", "bold");
  doc.text("PAID", pageWidth / 2, doc.internal.pageSize.getHeight() / 2,
    { align: 'center', angle: 45 });
  doc.setGState(new doc.GState({ opacity: 1 }));

  // === Save PDF ===
  const fileName = `Pasuseva_Invoice_${formData.fullName.replace(/\s+/g, '_')}_${date.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
}