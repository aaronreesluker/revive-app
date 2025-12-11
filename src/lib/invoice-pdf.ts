/**
 * PDF generation for invoices
 * Uses browser's print functionality for now (can be enhanced with jsPDF/html2canvas)
 */

export async function generateInvoicePDF(invoiceElement: HTMLElement): Promise<Blob | null> {
  // For now, use browser's print functionality
  // In production, you might want to use a server-side PDF generation library
  // like Puppeteer, Playwright, or a service like PDFShift
  
  try {
    // Create a new window for printing
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      throw new Error("Could not open print window. Please allow popups.");
    }

    // Clone the invoice element
    const clonedElement = invoiceElement.cloneNode(true) as HTMLElement;
    
    // Write to print window
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${invoiceElement.querySelector('[data-invoice-number]')?.textContent || ''}</title>
          <style>
            @media print {
              @page {
                margin: 0.5in;
              }
              body {
                margin: 0;
                padding: 0;
              }
            }
            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              margin: 0;
              padding: 20px;
            }
          </style>
        </head>
        <body>
          ${clonedElement.outerHTML}
        </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load, then print
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
      }, 250);
    };

    // Return null for now (print dialog handles it)
    // For actual PDF blob generation, use jsPDF/html2canvas or server-side solution
    return null;
  } catch (error) {
    console.error("Error generating PDF:", error);
    // Fallback to browser print
    window.print();
    return null;
  }
}

/**
 * Generate PDF using jsPDF and html2canvas (client-side)
 * This is a more advanced option that creates an actual PDF file
 */
export async function generateInvoicePDFBlob(invoiceElement: HTMLElement): Promise<Blob> {
  try {
    // Dynamically import to avoid bundling issues if not installed
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    // Convert HTML to canvas
    const canvas = await html2canvas(invoiceElement, {
      scale: 2,
      useCORS: true,
      logging: false,
    });

    // Create PDF
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgData = canvas.toDataURL("image/png");
    const imgWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;

    let position = 0;

    // Add first page
    pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;

    // Add additional pages if needed
    while (heightLeft >= 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;
    }

    // Return as blob
    return pdf.output("blob");
  } catch (error) {
    console.error("Error generating PDF blob:", error);
    throw new Error("PDF generation failed. Please use the print option instead.");
  }
}


