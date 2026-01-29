import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.warn('Gemini API key missing. Check your .env file.');
}

const genAI = new GoogleGenerativeAI(apiKey || 'placeholder-key');

export const getGeminiModel = (modelName = 'gemini-1.5-flash') => {
    return genAI.getGenerativeModel({ model: modelName });
};

// Agrawall Text Analysis Utility
export async function analyzeText(text: string, prompt: string) {
    const model = getGeminiModel();
    const result = await model.generateContent([prompt, text]);
    const response = await result.response;
    return response.text();
}

// OCR Vision Utility
export async function performOCR(imageAsBase64: string) {
    const model = getGeminiModel('gemini-1.5-flash');
    const result = await model.generateContent([
        'Extract all text from this receipt/invoice. Return it in JSON format with fields like amount, tax, date, merchant, and items.',
        {
            inlineData: {
                data: imageAsBase64,
                mimeType: 'image/jpeg',
            },
        },
    ]);
    const response = await result.response;
    return response.text();
}
