const { GoogleGenAI } = require('@google/genai');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function extraerDatosGemini(textoOCR) {
  const prompt = `Extrae del siguiente texto OCR:

- organismo_transito
- placa
- numero_recibo
- valor
- fecha

REGLAS:
- Responde SOLO JSON válido
- No expliques nada
- Si un dato no existe devuelve ""
- La placa debe tener formato colombiano
- El valor debe quedar solo numérico
- La fecha debe quedar DD/MM/YYYY

Texto OCR:
${textoOCR}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });
    
    let text = response.text;
    if (text.startsWith('```json')) {
      text = text.replace(/```json\n?/, '').replace(/```\n?$/, '');
    } else if (text.startsWith('```')) {
      text = text.replace(/```\n?/, '').replace(/```\n?$/, '');
    }
    
    return JSON.parse(text.trim());
  } catch (error) {
    console.error("Error al comunicarse con Gemini:", error);
    throw new Error("Fallo al extraer datos con IA");
  }
}

module.exports = { extraerDatosGemini };
