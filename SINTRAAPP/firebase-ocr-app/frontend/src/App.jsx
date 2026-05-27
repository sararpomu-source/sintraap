import { useState, useEffect, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, FileText, Trash2, Download, CheckCircle, AlertTriangle, Image as ImageIcon } from 'lucide-react';
import { exportToExcel } from './utils/excelExport';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function App() {
  const [facturas, setFacturas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchFacturas = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/facturas`);
      if (!res.ok) {
        throw new Error(`Error HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.exito && Array.isArray(data.datos)) {
        setFacturas(data.datos);
        return;
      }

      setFacturas([]);
    } catch (err) {
      console.error('Error fetching facturas', err);
      setFacturas([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchFacturas();
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [fetchFacturas]);

  const onDrop = useCallback(async (acceptedFiles) => {
    setUploading(true);
    for (let i = 0; i < acceptedFiles.length; i++) {
      setUploadProgress(Math.round(((i) / acceptedFiles.length) * 100));
      const file = acceptedFiles[i];
      const formData = new FormData();
      formData.append('file', file);
      try {
        await fetch(`${API_URL}/upload`, {
          method: 'POST',
          body: formData
        });
      } catch (e) {
        console.error("Error uploading", e);
      }
    }
    setUploadProgress(100);
    setTimeout(() => {
      setUploading(false);
      setUploadProgress(0);
      void fetchFacturas();
    }, 1000);
  }, [fetchFacturas]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, accept: {'image/*': ['.png', '.jpg', '.jpeg'], 'application/pdf': ['.pdf']} });

  const deleteFactura = async (id) => {
    if (!window.confirm('¿Eliminar registro?')) return;
    try {
      await fetch(`${API_URL}/facturas/${id}`, { method: 'DELETE' });
      setFacturas(f => f.filter(x => x.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const updateFactura = async (id, field, value) => {
    try {
      await fetch(`${API_URL}/facturas/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: value })
      });
      setFacturas(f => f.map(x => x.id === id ? { ...x, [field]: value } : x));
    } catch (e) {
      console.error(e);
    }
  };

  const filteredFacturas = facturas.filter(f => 
    Object.values(f).some(val => String(val).toLowerCase().includes(filter.toLowerCase()))
  );

  return (
    <div className="min-h-screen p-8">
      <header className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> SINTRAAPP V2
          </h1>
          <p className="text-slate-500 mt-1">Automatización OCR e IA de recibos de tránsito</p>
        </div>
        <button onClick={() => exportToExcel(facturas)} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
          <Download size={18} /> Exportar Excel
        </button>
      </header>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Total Procesados</p>
          <p className="text-3xl font-bold text-slate-800">{facturas.length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Válidos</p>
          <p className="text-3xl font-bold text-green-600">{facturas.filter(f => f.estadoValidacion === 'Valido').length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <p className="text-slate-500 text-sm font-medium">Requieren Revisión</p>
          <p className="text-3xl font-bold text-amber-500">{facturas.filter(f => f.estadoValidacion !== 'Valido').length}</p>
        </div>
      </div>

      {/* Dropzone */}
      <div {...getRootProps()} className={`mb-8 p-12 border-2 border-dashed rounded-xl text-center cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-slate-300 bg-white hover:bg-slate-50'}`}>
        <input {...getInputProps()} />
        <UploadCloud className="mx-auto text-slate-400 mb-4" size={48} />
        {uploading ? (
          <div>
            <p className="text-lg font-medium text-slate-700">Procesando facturas ({uploadProgress}%)...</p>
            <div className="w-64 h-2 bg-slate-200 rounded-full mx-auto mt-4 overflow-hidden">
              <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-lg font-medium text-slate-700">Arrastra tus recibos aquí (Imágenes o PDFs)</p>
            <p className="text-sm text-slate-500 mt-2">o haz clic para seleccionar archivos</p>
          </div>
        )}
      </div>

      {/* Table Section */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-semibold text-slate-800">Registros Recientes</h2>
          <input 
            type="text" 
            placeholder="Buscar..." 
            className="px-4 py-2 border border-slate-300 rounded-lg text-sm w-64 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="px-6 py-4">Estado</th>
                <th className="px-6 py-4">Imagen</th>
                <th className="px-6 py-4">Organismo</th>
                <th className="px-6 py-4">Placa</th>
                <th className="px-6 py-4">Recibo #</th>
                <th className="px-6 py-4">Valor</th>
                <th className="px-6 py-4">Fecha</th>
                <th className="px-6 py-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && facturas.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-500">Cargando datos...</td></tr>
              ) : filteredFacturas.length === 0 ? (
                <tr><td colSpan="8" className="text-center py-8 text-slate-500">No hay registros</td></tr>
              ) : filteredFacturas.map(f => (
                <tr key={f.id} className="hover:bg-slate-50 group">
                  <td className="px-6 py-4">
                    {f.estadoValidacion === 'Valido' ? (
                      <span className="flex items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-medium"><CheckCircle size={14}/> Válido</span>
                    ) : (
                      <span title={f.erroresValidacion?.join(', ')} className="flex items-center gap-1 text-amber-600 bg-amber-50 px-2 py-1 rounded text-xs font-medium cursor-help"><AlertTriangle size={14}/> Revisar</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    {f.imageUrl ? (
                      <a href={f.imageUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:text-blue-800">
                        <ImageIcon size={20} />
                      </a>
                    ) : <span className="text-slate-300">-</span>}
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-full"
                      value={f.organismo_transito || ''}
                      onChange={(e) => updateFactura(f.id, 'organismo_transito', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 font-mono">
                    <input 
                      className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-24"
                      value={f.placa || ''}
                      onChange={(e) => updateFactura(f.id, 'placa', e.target.value.toUpperCase())}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-32"
                      value={f.numero_recibo || ''}
                      onChange={(e) => updateFactura(f.id, 'numero_recibo', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4 font-medium">
                    <input 
                      className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-24"
                      value={f.valor || ''}
                      onChange={(e) => updateFactura(f.id, 'valor', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <input 
                      className="bg-transparent border-b border-transparent focus:border-blue-500 focus:outline-none w-28"
                      value={f.fecha || ''}
                      onChange={(e) => updateFactura(f.id, 'fecha', e.target.value)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <button onClick={() => deleteFactura(f.id)} className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default App;
