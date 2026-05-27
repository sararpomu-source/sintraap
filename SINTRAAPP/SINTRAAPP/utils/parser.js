/**
 * Analiza el texto extraído por OCR y busca campos clave de una factura
 * de tránsito usando expresiones regulares.
 * @param {string} texto - Texto crudo devuelto por Tesseract.js
 * @returns {Object} Campos sugeridos encontrados en el texto
 */
function parsearFactura(texto) {
  // Normalizar: eliminar saltos de línea extra y pasar a mayúsculas para facilitar búsqueda
  const textoNormalizado = texto.toUpperCase().replace(/\s+/g, ' ').trim();

  return {
    placa: extraerPlaca(textoNormalizado),
    valorTotal: extraerValorTotal(textoNormalizado),
    numeroFactura: extraerNumeroFactura(textoNormalizado),
    organismoTransito: extraerOrganismoTransito(textoNormalizado),
    fechaRecibo: extraerFechaRecibo(textoNormalizado),
  };
}

/**
 * Busca el organismo de tránsito en el texto de forma dinámica.
 */
function extraerOrganismoTransito(texto) {
  // Normalizar acentos y pasar a mayúsculas
  const textoLimpio = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();

  // Caso específico SIMIT
  if (/\bSIMIT\b/.test(textoLimpio)) {
    return 'SIMIT';
  }

  // Caso específico Organismo de tránsito municipal
  if (/\bORGANISMO\s+DE\s+TRANSITO\s+MUNICIPAL\b/.test(textoLimpio)) {
    return 'Organismo de tránsito municipal';
  }
  
  if (/\bSECRETARIA\s+DE\s+MOVILIDAD\s+Y\s+TRANSITO\b/.test(textoLimpio)) {
    return 'Secretaría de Movilidad y Tránsito';
  }
  
  if (/\bTRANSITO\s+MUNICIPAL\s+MUN\b/.test(textoLimpio) || /\bTRANSITO\s+MUNICIPAL\b/.test(textoLimpio)) {
    return 'Tránsito Municipal';
  }

  // Patrón: Secretaría de Movilidad [de/del/la ...]
  const matchMovilidad = textoLimpio.match(/\bSECRETARIA\s+DE\s+MOVILIDAD\s*(?:DE\s+|DEL\s+|DE\s+LA\s+)?([A-Z]{3,20})/);
  if (matchMovilidad && matchMovilidad[1] && !matchMovilidad[1].startsWith('Y ')) {
    const deDonde = matchMovilidad[1].trim();
    const municipio = deDonde.charAt(0).toUpperCase() + deDonde.slice(1).toLowerCase();
    return `Secretaría de Movilidad de ${municipio}`;
  }

  // Patrón: Tránsito de ...
  const matchTransito = textoLimpio.match(/\bTRANSITO\s*(?:DE\s+|DEL\s+)?([A-Z]{3,20})/);
  if (matchTransito && matchTransito[1]) {
    const deDonde = matchTransito[1].trim();
    if (deDonde !== 'MUNICIPAL') {
      const municipio = deDonde.charAt(0).toUpperCase() + deDonde.slice(1).toLowerCase();
      return `Tránsito de ${municipio}`;
    }
  }

  // Si contiene nombres de municipios conocidos
  const conocidos = {
    'MEDELLIN': 'Medellín',
    'ENVIGADO': 'Envigado',
    'SABANETA': 'Sabaneta',
    'ITAGUI': 'Itagüí',
    'BELLO': 'Bello'
  };
  for (const [key, value] of Object.entries(conocidos)) {
    if (new RegExp(`\\b${key}\\b`).test(textoLimpio)) {
      if (textoLimpio.includes('SECRETARIA DE MOVILIDAD')) {
        return `Secretaría de Movilidad de ${value}`;
      }
      return `Tránsito de ${value}`;
    }
  }

  // Si contiene "Secretaría de Movilidad" pero sin municipio específico
  if (/\bSECRETARIA\s+DE\s+MOVILIDAD\b/.test(textoLimpio)) {
    return 'Secretaría de Movilidad';
  }

  return 'Secretaría de Movilidad';
}

/**
 * Busca y estandariza la fecha de recibo en formato YYYY-MM-DD.
 */
function extraerFechaRecibo(texto) {
  // YYYY-MM-DD o YYYY/MM/DD
  const patronISO = /\b(\d{4})[-/](\d{2})[-/](\d{2})\b/;
  const matchISO = texto.match(patronISO);
  if (matchISO) {
    return `${matchISO[1]}-${matchISO[2]}-${matchISO[3]}`;
  }

  // DD/MM/YYYY o DD-MM-YYYY
  const patronLatino = /\b(\d{2})[-/](\d{2})[-/](\d{4})\b/;
  const matchLatino = texto.match(patronLatino);
  if (matchLatino) {
    return `${matchLatino[3]}-${matchLatino[2]}-${matchLatino[1]}`;
  }

  // MMM DD YYYY (ej: MAY 15 2026)
  const patronIngles = /\b(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)[A-Z]*\s+(\d{1,2})[,\s]+(\d{4})\b/i;
  const matchIngles = texto.match(patronIngles);
  if (matchIngles) {
    const meses = { jan: '01', feb: '02', mar: '03', apr: '04', may: '05', jun: '06', jul: '07', aug: '08', sep: '09', oct: '10', nov: '11', dec: '12' };
    const mes = meses[matchIngles[1].toLowerCase().substring(0, 3)];
    const dia = matchIngles[2].padStart(2, '0');
    const anio = matchIngles[3];
    return `${anio}-${mes}-${dia}`;
  }

  return null;
}


/**
 * Busca un número de placa colombiana (3 letras + 3 números) en todo el texto.
 */
function extraerPlaca(texto) {
  // Carro estándar: 3 letras + (guion|espacio)? + 3 dígitos
  const patronCarro = /\b([A-Z]{3})[-\s]?([0-9]{3})\b/i;
  const match = texto.match(patronCarro);
  if (match) {
    return (match[1] + match[2]).toUpperCase();
  }
  return null;
}

/**
 * Busca el valor total de la factura.
 * Soporta formatos colombianos con separadores de miles:
 *   "Total a Pagar STTM: 185,000"  →  185000
 *   "TOTAL: 185.000"               →  185000
 *   "VALOR ($): 185000"            →  185000
 *   "$ 1.234.567"                  →  1234567
 */
function extraerValorTotal(texto) {
  // Número con separadores de miles (185,000 / 185.000 / 1.234.567)
  // o número de 4+ dígitos sin separadores (185000)
  const PATRON_NUMERO = /(\d{1,3}(?:[.,]\d{3})+|\d{4,})/;

  // Patrón 1: palabra clave + hasta 60 caracteres no-dígito + número
  // El rango [^0-9]{0,60} absorbe texto intermedio como "A PAGAR STTM:"
  const patronPalabra = new RegExp(
    '(?:TOTAL|VALOR|PAGAR|MONTO)[^0-9]{0,60}' + PATRON_NUMERO.source
  );
  const matchPalabra = texto.match(patronPalabra);
  if (matchPalabra) return limpiarMonto(matchPalabra[1]);

  const montos = [];
  let match;

  // Patrón 2: símbolo $ seguido de número con miles o 4+ dígitos
  const patronDolar = new RegExp('\\$\\s*' + PATRON_NUMERO.source, 'g');
  while ((match = patronDolar.exec(texto)) !== null) {
    montos.push(limpiarMonto(match[1]));
  }

  // Patrón 3: número seguido opcionalmente por COP
  const patronCOP = new RegExp(PATRON_NUMERO.source + '\\s*COP\\b', 'g');
  while ((match = patronCOP.exec(texto)) !== null) {
    montos.push(limpiarMonto(match[1]));
  }

  // Devolver el monto más alto (asumimos que el total es el mayor)
  if (montos.length > 0) {
    return montos.reduce((a, b) => (Number(a) > Number(b) ? a : b));
  }

  return null;
}

/**
 * Busca el número de factura en el texto.
 * Cubre formatos como: FACTURA No. 001, FACT #0012, FAC-2024-001, RECIBO: 019332
 */
function extraerNumeroFactura(texto) {
  const patron = /(?:FACTURA|FACT\.?|FAC\.?|RECIBO)\s*(?:N[°OÚ]?\.?|#|NUM\.?|:)?\s*([A-Z0-9][A-Z0-9\-\/]{2,20})/;
  const match = texto.match(patron);
  if (match) return match[1].trim();

  // Intento alternativo: buscar secuencias como "No. 00123" o "N° 00123"
  const patronNumero = /N[°OoÚ]?\.?\s*([0-9]{3,15})/;
  const matchNum = texto.match(patronNumero);
  if (matchNum) return matchNum[1].trim();

  // Último recurso: un número largo aislado, de 8 a 15 dígitos
  const patronLargo = /\b(\d{8,15})\b/;
  const matchLargo = texto.match(patronLargo);
  if (matchLargo) return matchLargo[1];

  return null;
}

/**
 * Elimina separadores de miles (puntos y comas) y espacios del monto.
 * En Colombia ambos se usan como separador de miles, nunca como decimal
 * en facturas de tránsito, por lo que es seguro borrarlos todos.
 *   "185,000"   → "185000"
 *   "1.234.567" → "1234567"
 *   "185.000"   → "185000"
 */
function limpiarMonto(str) {
  return str.replace(/[.,\s]/g, '').trim();
}

module.exports = { parsearFactura };
