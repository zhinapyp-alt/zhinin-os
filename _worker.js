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

        // Llamada a la API de Anthropic
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': env.ANTHROPIC_API_KEY, // Aquí usaremos tu clave secreta
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-haiku-20240307',
            max_tokens: 800,
            system: systemPrompt,
            messages: messages.slice(-20).map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))
          })
        });

        const data = await response.json();
        
        if (data.error) {
          return new Response(JSON.stringify({ error: 'Error de Anthropic: ' + data.error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
        }

        const reply = data.content.map(b => b.text || '').join('').trim();
        return new Response(JSON.stringify({ reply }), { status: 200, headers: { 'Content-Type': 'application/json' } });

      } catch (error) {
        return new Response(JSON.stringify({ error: 'Zhinin no pudo responder ahora.' }), { status: 502, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Si no es el chat, muestra tu página web normal
    return env.ASSETS.fetch(request);
  }
};
