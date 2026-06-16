const { GoogleGenAI } = require("@google/genai");

function limpiarTexto(valor, limite = 1200) {
  return String(valor || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limite);
}

function extraerTextoRespuesta(response) {
  if (typeof response?.text === "string") {
    return response.text.trim();
  }

  const parts =
    response?.candidates?.[0]?.content?.parts || [];

  return parts
    .map((part) => part.text || "")
    .join(" ")
    .trim();
}

const explicarError = async (req, res) => {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return res.status(500).json({
        ok: false,
        message: "No está configurada la API key de Gemini."
      });
    }

    const pregunta = limpiarTexto(req.body.pregunta);
    const respuestaAlumno = limpiarTexto(req.body.respuestaAlumno || "Sin responder");
    const respuestaCorrecta = limpiarTexto(req.body.respuestaCorrecta);
    const materia = limpiarTexto(req.body.materia || "No especificada", 160);
    const tema = limpiarTexto(req.body.tema || "No especificado", 160);

    if (!pregunta || !respuestaCorrecta) {
      return res.status(400).json({
        ok: false,
        message: "Faltan datos para generar la explicación."
      });
    }

    const ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY
    });

    const prompt = `
Eres el tutor académico de EduQuak.

Tu tarea es explicar el error de un alumno después de contestar un cuestionario.
Responde en español mexicano, con tono claro, breve y educativo.
No inventes datos fuera de la pregunta.
No resuelvas temas ajenos.
No uses Markdown, asteriscos, títulos extra, emojis ni saludo inicial.
Responde únicamente con las 4 secciones indicadas.
Máximo 180 palabras.

Datos del cuestionario:
Materia: ${materia}
Tema: ${tema}
Pregunta: ${pregunta}
Respuesta del alumno: ${respuestaAlumno}
Respuesta correcta: ${respuestaCorrecta}

Estructura obligatoria exacta:
1. Por qué estuvo mal:
2. Respuesta correcta:
3. Explicación rápida:
4. Consejo para recordarlo:
`;

    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      contents: prompt
    });

    const explicacion =
      extraerTextoRespuesta(response) ||
      "No se pudo generar la explicación.";

    return res.json({
      ok: true,
      explicacion
    });
  } catch (error) {
    console.error("Error Gemini:", error);

    return res.status(500).json({
      ok: false,
      message: "No se pudo generar la explicación con IA."
    });
  }
};

module.exports = {
  explicarError
};
