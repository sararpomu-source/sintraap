import * as XLSX from 'xlsx';

export const exportToExcel = (data, fileName = 'facturas.xlsx') => {
  const ws = XLSX.utils.json_to_sheet(data.map(f => ({
    'Fecha Carga': new Date(f.fechaCarga).toLocaleString('es-CO'),
    'Organismo Tránsito': f.organismo_transito,
    'Placa': f.placa,
    'Número Recibo': f.numero_recibo,
    'Valor': f.valor,
    'Fecha Recibo': f.fecha,
    'Estado Validación': f.estadoValidacion,
    'Errores': f.erroresValidacion?.join(', ') || 'Ninguno',
    'Imagen URL': f.imageUrl || ''
  })));
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Facturas');
  XLSX.writeFile(wb, fileName);
};
