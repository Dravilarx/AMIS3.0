import { getGeminiModel } from '../../lib/gemini';

export interface ExtractedExpense {
    vendor: string;
    date: string;
    amount: number;
    currency: string;
    category: 'Alojamiento' | 'Alimentación' | 'Transporte' | 'Otros';
    taxId?: string; // RUT del emisor
}

/**
 * Servicio de IA para el módulo de Logística.
 * Utiliza Gemini Vision para extraer datos de boletas y facturas de gastos.
 */
export async function parseExpenseImage(imageBase64: string): Promise<ExtractedExpense> {
    const model = getGeminiModel();

    const prompt = `
    Analiza esta imagen de una boleta, factura o recibo de gasto.
    Extrae la información necesaria para un reporte de viáticos.
    Devuelve un objeto JSON con esta estructura:
    {
      "vendor": string (nombre del comercio),
      "date": string (ISO 8601 YYYY-MM-DD),
      "amount": number (monto total sin puntos ni símbolos),
      "currency": string (CLP, USD, etc),
      "category": "Alojamiento" | "Alimentación" | "Transporte" | "Otros",
      "taxId": string (RUT del emisor si existe)
    }
    Si no puedes leer algo, pon null.
  `;

    try {
        const result = await model.generateContent([
            prompt,
            {
                inlineData: {
                    data: imageBase64,
                    mimeType: 'image/jpeg', // O el tipo correspondiente
                },
            },
        ]);
        const text = result.response.text();
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('No se pudo encontrar el formato JSON en la respuesta de la IA.');
        return JSON.parse(jsonMatch[0]);
    } catch (error) {
        console.error('Error parsing expense with Gemini Vision:', error);
        throw new Error('No se pudo procesar el recibo con IA.');
    }
}
