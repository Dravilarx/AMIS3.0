// ============================================================
// AMIS 3.0 · Webhook de Telegram (bot del Contact Center)
// Serverless function en Vercel (edge runtime).
//
// Telegram envía un POST con un "update" cada vez que el bot
// recibe un mensaje. Por ahora la lógica es mínima: a CUALQUIER
// mensaje le respondemos un saludo de prueba, para verificar que
// la cañería (webhook → función → API de Telegram) funciona.
//
// El token del bot va en la variable de entorno TELEGRAM_BOT_TOKEN
// (configurada en Vercel), NUNCA escrito en el código.
// ============================================================

export const edgeConfig = { runtime: 'edge' };

export default async function handler(req: Request): Promise<Response> {
    // Telegram siempre llama por POST; cualquier otro método lo ignoramos.
    if (req.method !== 'POST') {
        return new Response('OK', { status: 200 });
    }

    try {
        // 1. Leer el "update" que envía Telegram.
        const body: any = await req.json();

        // 2. El mensaje viene en body.message. Sacamos chat_id (y el texto,
        //    que todavía no procesamos: por ahora respondemos siempre el saludo).
        const message = body?.message;
        const chatId = message?.chat?.id;

        // Si no hay chat_id no podemos responder (ej. updates que no son mensajes).
        if (chatId) {
            const token = process.env.TELEGRAM_BOT_TOKEN;

            if (!token) {
                // Sin token no podemos llamar a Telegram; lo dejamos registrado.
                console.error('[telegram] Falta la variable de entorno TELEGRAM_BOT_TOKEN');
            } else {
                // 3. Responder llamando a la API de Telegram (sendMessage).
                const url = `https://api.telegram.org/bot${token}/sendMessage`;
                const resp = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        chat_id: chatId,
                        text: 'Hola 👋 soy AMIS Contact Center. Estoy en construcción.',
                    }),
                });

                // Si Telegram devuelve error, lo registramos (pero no rompemos el flujo).
                if (!resp.ok) {
                    const detail = await resp.text();
                    console.error('[telegram] sendMessage falló:', resp.status, detail);
                }
            }
        }

        // 4. Respondemos 200 OK a Telegram para que NO reintente en loop.
        return new Response('OK', { status: 200 });

    } catch (e: any) {
        // 5. Ante cualquier error, lo registramos pero igual devolvemos 200,
        //    de nuevo para evitar reintentos infinitos de Telegram.
        console.error('[telegram] Error procesando el webhook:', e);
        return new Response('OK', { status: 200 });
    }
}
