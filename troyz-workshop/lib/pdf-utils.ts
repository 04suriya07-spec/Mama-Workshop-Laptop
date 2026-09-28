import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export async function generatePDFFromElement(
  elementId: string,
  filename: string,
  options?: { orientation?: 'portrait' | 'landscape'; padding?: number }
): Promise<void> {
  const el = document.getElementById(elementId);
  if (!el) {
    console.error('PDF element not found:', elementId);
    if (typeof window !== 'undefined') {
      window.print();
    }
    return;
  }

  const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
  const padding = options?.padding ?? 12;
  const orientation = options?.orientation ?? 'portrait';

  try {
    const canvas = await html2canvas(el, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#0f172a', // Clean dark theme background matching MEW OS
      logging: false,
      windowWidth: 1024,
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: 'a4',
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pdfWidth - padding * 2;
    const imgHeight = (canvas.height * contentWidth) / canvas.width;

    let heightLeft = imgHeight;
    let position = padding;

    pdf.addImage(imgData, 'JPEG', padding, position, contentWidth, imgHeight);
    heightLeft -= (pdfHeight - padding * 2);

    while (heightLeft > 0) {
      position = -(imgHeight - heightLeft) + padding;
      pdf.addPage();
      pdf.addImage(imgData, 'JPEG', padding, position, contentWidth, imgHeight);
      heightLeft -= (pdfHeight - padding * 2);
    }

    const safeFilename = `${filename.replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

    // 1. Android Native Bridge: Save via FileProvider & open intent
    if (nv && typeof nv.saveBase64File === 'function') {
      const dataUri = pdf.output('datauristring');
      const base64Data = dataUri.split(',')[1] || '';
      nv.saveBase64File(safeFilename, 'application/pdf', base64Data);
      return;
    }

    // 2. Android Native Print fallback
    if (nv && typeof nv.printDocument === 'function') {
      nv.printDocument();
      return;
    }

    // 3. Web browser direct download
    pdf.save(safeFilename);
  } catch (err) {
    console.error('PDF generation error, falling back to window.print():', err);
    if (nv && typeof nv.printDocument === 'function') {
      nv.printDocument();
    } else if (typeof window !== 'undefined') {
      window.print();
    }
  }
}

export function printCurrentReport(): void {
  const nv = typeof window !== 'undefined' ? (window as any).AndroidNativeVoice : null;
  if (nv && typeof nv.printDocument === 'function') {
    nv.printDocument();
  } else if (typeof window !== 'undefined') {
    window.print();
  }
}

