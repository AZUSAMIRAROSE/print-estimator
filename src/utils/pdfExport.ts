import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { Quotation, EstimationResult, EstimationInput } from "@/types";
import { formatDate } from "@/utils/format";

export interface PDFExportOptions {
    quotationNumber?: string;
    revisionNumber?: number;
    customerName: string;
    jobTitle: string;
    status?: string;
    currency: string;
    totalValue: number;
    validUntil?: string;
    createdAt: string;
    estimationInput?: EstimationInput;
    results?: EstimationResult[];
}

export const generateQuotationPDF = async (options: PDFExportOptions): Promise<Uint8Array> => {
    const doc = new jsPDF();

    // Header Letterhead
    doc.setFontSize(22);
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.text("PRINT QUOTATION", 14, 22);

    doc.setFontSize(10);
    doc.setTextColor(100, 116, 139); // Slate 500
    doc.text(`Date Issued: ${formatDate(options.createdAt)}`, 14, 30);
    if (options.validUntil) {
        doc.text(`Valid Until: ${formatDate(options.validUntil)}`, 14, 35);
    }
    if (options.quotationNumber) {
        doc.text(`Quote Reference: ${options.quotationNumber}${options.revisionNumber !== undefined ? ` (Rev. ${options.revisionNumber})` : ""}`, 14, 40);
    }

    // Customer Block
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // Slate 900
    doc.text("Bill To:", 14, 52);
    doc.setFontSize(11);
    doc.text(options.customerName, 14, 58);

    // Job Details
    doc.setFontSize(11);
    doc.text(`Job description: ${options.jobTitle}`, 14, 68);

    // Specifications
    let startY = 75;
    if (options.estimationInput) {
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139);
        doc.text("Specifications:", 14, startY);
        startY += 8;

        // Add Specs Table
        const specRows = [];
        specRows.push(["Trim Size", `${options.estimationInput.bookSpec.widthMM} × ${options.estimationInput.bookSpec.heightMM} mm`]);
        specRows.push(["Binding", options.estimationInput.binding.primaryBinding.replace(/_/g, " ").toUpperCase()]);

        // AutoTable for Specs
        autoTable(doc, {
            startY: startY,
            body: specRows,
            theme: 'plain',
            styles: { fontSize: 9, cellPadding: 2, textColor: [30, 41, 59] },
            columnStyles: { 0: { fontStyle: 'bold', cellWidth: 40 } },
        });

        startY = (doc as any).lastAutoTable.finalY + 10;
    }

    autoTable(doc, {
        startY: startY,
        head: [['Item Description', 'Qty', 'Unit Price', 'Total Value']],
        body: [
            [
                options.jobTitle,
                options.results && options.results.length > 0 ? options.results[0].quantity.toLocaleString() : "-",
                options.results && options.results.length > 0 ? `${options.currency} ${options.results[0].totalCostPerCopy.toFixed(2)}` : "-",
                `${options.currency} ${options.totalValue.toLocaleString()}`
            ]
        ],
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
        styles: { fontSize: 10, cellPadding: 6, textColor: [30, 41, 59] }
    });

    const finalY = (doc as any).lastAutoTable.finalY || startY;

    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42);
    doc.text(`Grand Total: ${options.currency} ${options.totalValue.toLocaleString()}`, 14, finalY + 15);

    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139);
    doc.text("Thank you for your business. This quotation is subject to our standard terms and conditions.", 14, finalY + 30);

    const pdfArrayBuffer = doc.output('arraybuffer');
    return new Uint8Array(pdfArrayBuffer);
};
