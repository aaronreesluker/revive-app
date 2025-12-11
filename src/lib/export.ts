/**
 * Data Export Utilities
 * Export data to CSV, JSON, or PDF formats
 */

export type ExportFormat = "csv" | "json" | "pdf";

interface ExportOptions {
  filename?: string;
  format?: ExportFormat;
  headers?: string[];
  title?: string;
}

/**
 * Export data to CSV format
 */
export function exportToCSV<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): void {
  if (data.length === 0) {
    console.warn("No data to export");
    return;
  }

  const { filename = "export", headers } = options;
  
  // Get headers from data keys or use provided headers
  const keys = headers || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    // Header row
    keys.join(","),
    // Data rows
    ...data.map((row) =>
      keys
        .map((key) => {
          const value = row[key];
          // Handle special characters in CSV
          if (typeof value === "string" && (value.includes(",") || value.includes('"') || value.includes("\n"))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? "";
        })
        .join(",")
    ),
  ].join("\n");

  // Create and download file
  downloadFile(csvContent, `${filename}.csv`, "text/csv;charset=utf-8;");
}

/**
 * Export data to JSON format
 */
export function exportToJSON<T>(data: T, options: ExportOptions = {}): void {
  const { filename = "export" } = options;
  const jsonContent = JSON.stringify(data, null, 2);
  downloadFile(jsonContent, `${filename}.json`, "application/json;charset=utf-8;");
}

/**
 * Generate and download a PDF report
 * Note: This is a simple text-based PDF. For complex layouts, consider using a library like pdfmake or jsPDF
 */
export async function exportToPDF<T extends Record<string, unknown>>(
  data: T[],
  options: ExportOptions = {}
): Promise<void> {
  const { filename = "report", title = "Data Export" } = options;
  
  // For a simple implementation, we'll create a printable HTML page
  // In production, you'd want to use a proper PDF library
  const keys = options.headers || (data.length > 0 ? Object.keys(data[0]) : []);
  
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>${title}</title>
      <style>
        body { font-family: system-ui, -apple-system, sans-serif; padding: 40px; }
        h1 { color: #0d9488; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #e5e7eb; padding: 12px; text-align: left; }
        th { background: #f9fafb; font-weight: 600; }
        tr:nth-child(even) { background: #f9fafb; }
        .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
        @media print {
          body { padding: 20px; }
        }
      </style>
    </head>
    <body>
      <h1>${title}</h1>
      <p class="meta">Generated on ${new Date().toLocaleString()}</p>
      <table>
        <thead>
          <tr>
            ${keys.map((key) => `<th>${formatHeader(key)}</th>`).join("")}
          </tr>
        </thead>
        <tbody>
          ${data
            .map(
              (row) =>
                `<tr>${keys.map((key) => `<td>${formatValue(row[key])}</td>`).join("")}</tr>`
            )
            .join("")}
        </tbody>
      </table>
    </body>
    </html>
  `;

  // Open print dialog
  const printWindow = window.open("", "_blank");
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.onload = () => {
      printWindow.print();
    };
  }
}

/**
 * Generic export function that handles format selection
 */
export function exportData<T extends Record<string, unknown>>(
  data: T[],
  format: ExportFormat,
  options: ExportOptions = {}
): void {
  switch (format) {
    case "csv":
      exportToCSV(data, options);
      break;
    case "json":
      exportToJSON(data, options);
      break;
    case "pdf":
      exportToPDF(data, options);
      break;
    default:
      console.error(`Unsupported export format: ${format}`);
  }
}

/**
 * Helper to download a file
 */
function downloadFile(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Format header for display (camelCase to Title Case)
 */
function formatHeader(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format value for display
 */
function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}


