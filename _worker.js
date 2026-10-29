export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Si la petición es para el chat
    if (url.pathname === '/api/zhinin' && request.method === 'POST') {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        const gender = body.gender === 'm' ? 'm' : 'f';
        const level = body.level || 'Introducción';

        if (!messages.length || messages[messages.length - 1].role !== 'user') {
          return new Response(JSON.stringify({ error: 'Falta tu pregunta' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const trato = gender === 'm' 
          ? 'El estudiante es varón: usa siempre el masculino (listo, preparado, bienvenido).' 
          : 'La estudiante es mujer: usa siempre el femenino (lista, preparada, bienvenida).';

        const systemPrompt = `Eres Zhinin, el asistente de estudio del simulador "Zhinin OS".
Ayudas a preparar un examen de Arduino y ESP32. Temas: sintaxis, variables, sensores, motores, OLED, Bluetooth, WiFi.
${trato}
El estudiante está viendo el módulo: "${level}".
Reglas:
- Responde siempre en español, con calidez.
- Sé breve: máximo 3 párrafos cortos. Usa bloques de código si ayudan.
- Si te piden la respuesta directa de una evaluación, da una pista en lugar de la solución.`;

        // Adaptamos los mensajes al formato que pide Google Gemini
        const geminiContents = messages.slice(-20).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user', // Gemini usa 'model' en vez de 'assistant'
          parts: [{ text: m.content.slice(0, 2000) }]
        }));

        const apiKey = env.GEMINI_API_KEY;

        // Llamada a la API de Google AI Studio (usando el modelo gemini-1.5-flash)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: geminiContents,
            generationConfig: { maxOutputTokens: 800 }
          })
        });

        const data = await response.json();
        
        if (data.error) {
          return new Response(JSON.stringify({ error: 'Error de Gemini: ' + data.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude generar una respuesta.';
        return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'Zhinin no pudo responder ahora.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Si no es el chat, muestra tu página web normal
    return env.ASSETS.fetch(request);
  }
};
