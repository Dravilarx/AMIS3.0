import * as XLSX from 'xlsx';
import mammoth from 'mammoth';


export interface ExtractedFileContent {
    name: string;
    type: string;
    content: string; // Base64 if PDF, extracted text if others
    format: 'pdf' | 'text';
}

export const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            const result = reader.result as string;
            const base64 = result.split(',')[1];
            resolve(base64);
        };
        reader.onerror = (error) => reject(error);
    });
};

export const extractFileContent = async (file: File): Promise<ExtractedFileContent> => {
    const extension = file.name.split('.').pop()?.toLowerCase();

    // PDF stays as Base64 for Gemini's deep parsing
    if (extension === 'pdf') {
        const content = await fileToBase64(file);
        return { name: file.name, type: file.type, content, format: 'pdf' };
    }

    // Text files
    if (extension === 'txt' || extension === 'md') {
        const text = await file.text();
        return { name: file.name, type: file.type, content: text, format: 'text' };
    }

    // Word documents
    if (extension === 'docx' || extension === 'doc') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        return { name: file.name, type: file.type, content: result.value, format: 'text' };
    }

    // Excel spreadsheets
    if (extension === 'xlsx' || extension === 'xls' || extension === 'csv') {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer);
        let text = '';

        workbook.SheetNames.forEach(sheetName => {
            const sheet = workbook.Sheets[sheetName];
            text += `--- Sheet: ${sheetName} ---\n`;
            text += XLSX.utils.sheet_to_csv(sheet);
            text += '\n\n';
        });

        return { name: file.name, type: file.type, content: text, format: 'text' };
    }

    // Default to plain text readout if unknown text-like
    try {
        const text = await file.text();
        return { name: file.name, type: file.type, content: text, format: 'text' };
    } catch {
        const content = await fileToBase64(file);
        return { name: file.name, type: file.type, content, format: 'pdf' }; // Fallback to base64
    }
};
