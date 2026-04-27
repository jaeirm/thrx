import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export async function parseDocument(file: File): Promise<string> {
    const type = file.type;
    const name = file.name.toLowerCase();

    if (type === 'application/pdf' || name.endsWith('.pdf')) {
        return parsePDF(file);
    } else if (type === 'text/csv' || name.endsWith('.csv')) {
        return parseCSV(file);
    } else if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
        return parseXLSX(file);
    } else if (type.startsWith('text/') || name.endsWith('.txt')) {
        return parseText(file);
    } else {
        throw new Error('Unsupported file format for RAG');
    }
}

async function parseText(file: File): Promise<string> {
    return await file.text();
}

async function parseCSV(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        Papa.parse(file, {
            complete: (results: any) => {
                // Convert arrays of rows into a single string representation
                const text = results.data.map((row: any) => Object.values(row).join(' ')).join('\n');
                resolve(text);
            },
            error: (error: any) => {
                reject(error);
            }
        });
    });
}

async function parseXLSX(file: File): Promise<string> {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    
    // Process each sheet
    for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const csv = XLSX.utils.sheet_to_csv(worksheet);
        fullText += `--- Sheet: ${sheetName} ---\n${csv}\n`;
    }
    
    return fullText;
}

async function parsePDF(file: File): Promise<string> {
    // Dynamically import to avoid SSR 'DOMMatrix is not defined' error
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDocument = await loadingTask.promise;
    
    let text = '';
    for (let i = 1; i <= pdfDocument.numPages; i++) {
        const page = await pdfDocument.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        text += pageText + '\n';
    }
    
    return text;
}
