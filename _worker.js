export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Si la petición es para nuestro chat de IA
    if (url.pathname === '/api/zhinin' && request.method === 'POST') {
      try {
        const body = await request.json();
        const messages = body.messages || [];
        const gender = body.gender === 'm' ? 'm' : 'f';
        const level = body.level || 'Introducción';

        const trato = gender === 'm' 
          ? 'masculino (listo, preparado)' 
          : 'femenino (lista, preparada)';

        const systemPrompt = `Eres Zhinin, asistente de Arduino y ESP32. Responde en español, breve. Trato: ${trato}. Módulo: ${level}.`;

        const geminiContents = messages.slice(-20).map(m => ({
          role: m.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: m.content.slice(0, 2000) }]
        }));

        const apiKey = env.GEMINI_API_KEY;
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
        if (data.error) return new Response(JSON.stringify({ error: data.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No pude responder.';
        return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'Error de Zhinin.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // SALVAVIDAS: Si no es el chat, muestra el index.html
    try {
      return await env.ASSETS.fetch(request);
    } catch (e) {
      // Si falla la ruta exacta, forzamos la raíz para que cargue el index
      return env.ASSETS.fetch(new Request(new URL('/', request.url), request));
    }
  }
};
