const { parsearFactura } = require('./utils/parser');

const tests = [
  "Organismo de transito: Secretaría de Movilidad Envigado\nPlaca: FGT 476\nNúmero de recibo: 1000411761\nFecha: 12/07/2026\nValor Total: 560000 COP",
  "SECRETARIA DE MOVILIDAD Y TRANSITO\nJQT717 HERNAN ALONSO MUNERA BEDOYA 98494425\nNo. 203459688\nTOTAL 542.900\nFecha: 14/05/2026 11:19",
  "Redeban\nMAY 15 2026 14:41:48\nTRANSITO MUNICIPAL MUN\nRECIBO: 019332\nTOTAL $ 1.890.932"
];

tests.forEach((t, i) => {
  console.log(`--- Test ${i + 1} ---`);
  console.log(parsearFactura(t));
});
