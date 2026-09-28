// ═══════════════════════════════════════════════════════════
//  MEW OS — Invoice, WhatsApp & UPI QR Utilities
// ═══════════════════════════════════════════════════════════

export interface InvoiceData {
  id: string;
  date: string;
  customerName: string;
  customerPhone?: string;
  vehicleNumber: string;
  vehicleModel?: string;
  items: Array<{
    description: string;
    qty: number;
    rate: number;
    amount: number;
  }>;
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  advancePaid: number;
  balanceDue: number;
  upiId?: string;
  notes?: string;
}

/**
 * Builds a standard UPI payment URL.
 */
export function buildUpiUrl(params: {
  upiId: string;
  payeeName: string;
  amount: number;
  transactionNote?: string;
}): string {
  const { upiId, payeeName, amount, transactionNote = 'Workshop Bill Payment' } = params;
  const cleanUpi = encodeURIComponent(upiId.trim());
  const cleanName = encodeURIComponent(payeeName.trim());
  const cleanNote = encodeURIComponent(transactionNote.trim());
  const cleanAmount = amount > 0 ? amount.toFixed(2) : '0.00';

  return `upi://pay?pa=${cleanUpi}&pn=${cleanName}&am=${cleanAmount}&cu=INR&tn=${cleanNote}`;
}

/**
 * Returns a QR Code image URL via QuickChart API for the UPI deep link.
 */
export function getUpiQrCodeUrl(upiUrl: string, size = 200): string {
  return `https://quickchart.io/qr?text=${encodeURIComponent(upiUrl)}&size=${size}&margin=1&ecLevel=M`;
}

/**
 * Formats a clean, professional WhatsApp invoice message in Tamil or English.
 */
export function formatWhatsAppInvoiceText(invoice: InvoiceData, lang: 'ta' | 'en' = 'ta'): string {
  const isTamil = lang === 'ta';
  const upiLink = invoice.upiId && invoice.balanceDue > 0
    ? buildUpiUrl({
        upiId: invoice.upiId,
        payeeName: 'Mama Engineering Works',
        amount: invoice.balanceDue,
        transactionNote: `Bill ${invoice.id} - ${invoice.vehicleNumber}`,
      })
    : '';

  if (isTamil) {
    let msg = `*வணக்கம் ${invoice.customerName || 'சார்'},*\n`;
    msg += `*மதர்ஸ் & மாமா இன்ஜினியரிங் ஒர்க்ஸ் (MEW)*\n`;
    msg += `----------------------------------------\n`;
    msg += `📋 *பில் எண்:* #${invoice.id}\n`;
    msg += `📅 *தேதி:* ${invoice.date}\n`;
    msg += `🚜 *வண்டி எண்:* ${invoice.vehicleNumber} ${invoice.vehicleModel ? `(${invoice.vehicleModel})` : ''}\n`;
    msg += `----------------------------------------\n`;
    msg += `*பணிகள் & உதிரிபாகங்கள்:*\n`;

    invoice.items.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.description} (x${item.qty}) — ₹${item.amount.toLocaleString('en-IN')}\n`;
    });

    msg += `----------------------------------------\n`;
    msg += `💰 *மொத்த தொகை:* ₹${invoice.total.toLocaleString('en-IN')}\n`;
    if (invoice.advancePaid > 0) {
      msg += `🟢 *முன்பணம் (Advance):* -₹${invoice.advancePaid.toLocaleString('en-IN')}\n`;
    }
    msg += `🔴 *செலுத்த வேண்டிய நிலுவை:* *₹${invoice.balanceDue.toLocaleString('en-IN')}*\n`;
    msg += `----------------------------------------\n`;

    if (invoice.upiId && invoice.balanceDue > 0) {
      msg += `📲 *GooglePay / PhonePe UPI:* \`${invoice.upiId}\`\n`;
      msg += `👉 நேரடி கட்டண இணைப்பு: ${upiLink}\n\n`;
    }

    msg += `நன்றி! தங்களின் ஆதரவுக்கு மனமார்ந்த நன்றிகள். 🙏\n`;
    msg += `📞 *தொடர்புக்கு:* MEW Workshop Team`;
    return msg;
  } else {
    let msg = `*Dear ${invoice.customerName || 'Customer'},*\n`;
    msg += `*Mama Engineering Works (MEW)*\n`;
    msg += `----------------------------------------\n`;
    msg += `📋 *Invoice #:* #${invoice.id}\n`;
    msg += `📅 *Date:* ${invoice.date}\n`;
    msg += `🚜 *Vehicle:* ${invoice.vehicleNumber} ${invoice.vehicleModel ? `(${invoice.vehicleModel})` : ''}\n`;
    msg += `----------------------------------------\n`;
    msg += `*Items & Labor:*\n`;

    invoice.items.forEach((item, idx) => {
      msg += `${idx + 1}. ${item.description} (x${item.qty}) — ₹${item.amount.toLocaleString('en-IN')}\n`;
    });

    msg += `----------------------------------------\n`;
    msg += `💰 *Total Amount:* ₹${invoice.total.toLocaleString('en-IN')}\n`;
    if (invoice.advancePaid > 0) {
      msg += `🟢 *Advance Paid:* -₹${invoice.advancePaid.toLocaleString('en-IN')}\n`;
    }
    msg += `🔴 *Net Balance Due:* *₹${invoice.balanceDue.toLocaleString('en-IN')}*\n`;
    msg += `----------------------------------------\n`;

    if (invoice.upiId && invoice.balanceDue > 0) {
      msg += `📲 *UPI ID:* \`${invoice.upiId}\`\n`;
      msg += `👉 Pay via UPI: ${upiLink}\n\n`;
    }

    msg += `Thank you for your business! 🙏\n`;
    msg += `📞 *Contact:* Mama Engineering Works`;
    return msg;
  }
}

/**
 * Opens WhatsApp directly with customer phone and prefilled message.
 */
export function openWhatsAppInvoice(phone: string, text: string): void {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  const finalPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
  const url = `https://wa.me/${finalPhone}?text=${encodeURIComponent(text)}`;
  window.open(url, '_blank');
}
