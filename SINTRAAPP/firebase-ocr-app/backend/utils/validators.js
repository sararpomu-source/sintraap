const REGEX_PLACA = /^[A-Z]{3}\s?\d{3}$/i;
const REGEX_FECHA = /^\d{1,2}\/\d{1,2}\/\d{4}$/;
const REGEX_VALOR = /^[\d\.\,]+$/;

const ORGANISMOS_CONOCIDOS = [
  "SECRETARIA DE MOVILIDAD",
  "SECRETARIA DE MOVILIDAD Y TRANSITO",
  "TRANSITO MUNICIPAL",
  "SECRETARIA DE TRANSITO",
  "MOVILIDAD ENVIGADO",
  "TRANSITO SABANETA"
];

function detectarOrganismo(texto) {
  if (!texto) return null;
  const textoUpper = texto.toUpperCase();
  for (const org of ORGANISMOS_CONOCIDOS) {
    if (textoUpper.includes(org)) {
      return org;
    }
  }
  return null;
}

function validarFactura(datos) {
  let errores = [];
  
  if (datos.placa && !REGEX_PLACA.test(datos.placa)) {
    errores.push("Formato de placa inválido");
  }
  
  if (datos.fecha && !REGEX_FECHA.test(datos.fecha)) {
    errores.push("Formato de fecha inválido (esperado DD/MM/YYYY)");
  }
  
  if (datos.valor && !REGEX_VALOR.test(String(datos.valor))) {
    errores.push("El valor debe contener solo números");
  }
  
  return errores;
}

module.exports = { validarFactura, detectarOrganismo };
