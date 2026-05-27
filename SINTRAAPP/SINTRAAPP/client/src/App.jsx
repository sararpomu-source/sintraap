import { useState, useRef, useEffect, useMemo } from 'react';
import { XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, CartesianGrid, AreaChart, Area, BarChart, Bar } from 'recharts';
import { Camera, Loader2, Save, LogIn, CheckCircle, AlertCircle, ChevronLeft, Search, Download, LayoutDashboard, RefreshCw, FileText, Trash2, Wallet, Users, ReceiptText, Image as ImageIcon, CreditCard, Banknote } from 'lucide-react';
import './index.css';

// ─── Paleta SINTRA ──────────────────────────────────────────────────────────────
// Primario  (Cyan)  #00ADEF · hover #0098D4
// Secundario (Navy) #003366 · hover #004080
// Fondo            #F4F7F9

const ORGANISMOS = ['Medellín', 'Envigado', 'Sabaneta', 'Itagüí', 'Bello'];

const FORM_VACIO = {
  organismo_transito: '',
  placa: '',
  valor_tramite: '',
  numero_recibo: '',
  fecha_recibo: '',
};

// Cuentas de prueba predefinidas en el sistema
const CUENTAS_PREDEFINIDAS = [
  { email: 'administrador', pass: 'admin123', role: 'admin', nombre: 'Administrador', token: 'token-admin-000' },
  { email: 'Alejandro', pass: 'alejo123', role: 'mensajero', nombre: 'Alejandro', token: 'token-alejandro-111' },
  { email: 'Victor', pass: 'victor123', role: 'mensajero', nombre: 'Victor', token: 'token-victor-222' },
  { email: 'Laura', pass: 'laura123', role: 'mensajero', nombre: 'Laura', token: 'token-laura-333' }
];

const ROLE_META = {
  admin: {
    label: 'Administrador',
    description: 'Supervisa el flujo, valida y exporta reportes.',
    accent: 'from-[#003366] to-[#00549A]',
    badge: 'bg-[#003366] text-white'
  },
  mensajero: {
    label: 'Mensajero',
    description: 'Captura, procesa y revisa facturas de tránsito.',
    accent: 'from-[#00ADEF] to-[#7FCDEE]',
    badge: 'bg-[#E6F6FD] text-[#003366]'
  }
};

// ─── Utilidades ───────────────────────────────────────────────────────────────

function inputClase(extra = '') {
  return `w-full border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm bg-white
          focus:outline-none focus:ring-2 focus:ring-[#00ADEF] focus:border-transparent
          transition-shadow shadow-sm ${extra}`;
}

const formatearMoneda = (valor) =>
  new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(valor ?? 0);

const METODOS_PAGO = {
  efectivo: 'Efectivo',
  transferencia: 'Transferencia',
  tarjeta: 'Tarjeta',
  no_especificado: 'No especificado'
};

const PRESUPUESTO_OPERATIVO = 50000000;

const obtenerIniciales = (nombre = 'Usuario') =>
  nombre.split(' ').map((parte) => parte[0]).slice(0, 2).join('').toUpperCase();

const obtenerMetodoPago = (factura) => {
  const metodo = factura?.payment_method || factura?.datos_ocr?.payment_method || 'no_especificado';
  return METODOS_PAGO[metodo] || METODOS_PAGO.no_especificado;
};

const obtenerTipoTramite = (factura) => {
  const tipo = factura?.tipo_tramite || factura?.datos_ocr?.tipo_tramite;
  if (tipo) return tipo;

  const texto = String(factura?.datos_ocr?.textoCompleto || '').toLowerCase();
  const organismo = String(factura?.organismo_transito || '').toLowerCase();

  if (texto.includes('matricula') || texto.includes('matrícula')) return 'Matrícula';
  if (texto.includes('refrendo')) return 'Refrendo';
  if (texto.includes('soat') || texto.includes('seguro')) return 'SOAT';
  if (texto.includes('placa') || texto.includes('pico y placa')) return 'Placa';
  if (organismo.includes('simit')) return 'SIMIT';
  if (organismo.includes('movilidad')) return 'Movilidad';
  if (organismo.includes('transito')) return 'Tránsito';
  return 'General';
};

const obtenerDocumento = (factura) =>
  factura?.imagen_original || factura?.url_foto || '';

const fetchJSON = async (url, opciones = {}) => {
  let resp;
  try {
    resp = await fetch(url, opciones);
  } catch (e) {
    throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.');
  }

  const texto = await resp.text();
  let json;
  try {
    json = JSON.parse(texto || '{}');
  } catch (e) {
    throw new Error('El servidor no devolvió una respuesta válida (JSON inválido).');
  }

  if (!resp.ok || !json.exito) {
    throw new Error(json.mensaje || `Error en la petición (Código: ${resp.status})`);
  }
  return json;
};

// ─── Componentes de UI compartidos ───────────────────────────────────────────

function Campo({ label, children, className = '' }) {
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
        {label}
      </label>
      {children}
    </div>
  );
}

function LogoSINTRA({ variant = 'light' }) {
  const titleColor = variant === 'light' ? 'text-white' : 'text-[#003366]';
  const subColor = variant === 'light' ? 'text-[#7FCDEE]' : 'text-gray-500';
  return (
    <div className="flex items-center gap-2.5">
      <div className="bg-[#00ADEF] text-white font-black text-sm px-2.5 py-1.5 rounded-lg tracking-widest shadow-sm select-none">
        SINTRA
      </div>
      <div className="leading-tight">
        <span className={`font-bold text-[15px] block ${titleColor}`}>Servicios Integrales</span>
        <span className={`text-[11px] ${subColor}`}>Gestión de Trámites</span>
      </div>
    </div>
  );
}

function FooterApp() {
  return (
    <footer className="text-center py-3 text-[11px] text-gray-400 border-t border-gray-100 bg-white w-full">
      Plataforma homologada para el máximo cumplimiento normativo · SINTRA v1.0
    </footer>
  );
}

// ─── Pantalla: Login ──────────────────────────────────────────────────────────

function PantallaLogin({ onLogin }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [rolFiltro, setRolFiltro] = useState('all');
  const [mostrarPassword, setMostrarPassword] = useState(false);

  const cuentasVisibles = rolFiltro === 'all'
    ? CUENTAS_PREDEFINIDAS
    : CUENTAS_PREDEFINIDAS.filter((cuenta) => cuenta.role === rolFiltro);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usuario || !password) {
      setError('Ingresa tu usuario y contraseña.');
      return;
    }

    setCargando(true);
    await new Promise((r) => setTimeout(r, 600));

    const cuenta = CUENTAS_PREDEFINIDAS.find(
      (c) => c.email.toLowerCase() === usuario.toLowerCase() && c.pass === password
    );

    setCargando(false);

    if (cuenta) {
      onLogin({
        email: cuenta.email,
        nombre: cuenta.nombre,
        role: cuenta.role,
        token: cuenta.token
      });
      return;
    }

    setError('Credenciales incorrectas. Prueba una de las cuentas de demo o revisa tu contraseña.');
  };

  const usarCuentaDemo = (cuenta) => {
    setUsuario(cuenta.email);
    setPassword(cuenta.pass);
    setRolFiltro(cuenta.role);
    setError('');
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#0B548C,_#003366_55%,_#001C34)] flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-5xl grid lg:grid-cols-[1.05fr_1fr] gap-0 overflow-hidden rounded-[28px] shadow-[0_30px_80px_rgba(0,0,0,0.28)] bg-white">
        <div className="bg-[#003366] px-8 py-8 sm:px-10 sm:py-10 flex flex-col justify-between">
          <div className="space-y-6">
            <LogoSINTRA variant="light" />
            <div className="space-y-3">
              <p className="text-[#7FCDEE] text-sm font-semibold uppercase tracking-[0.2em]">Plataforma SINTRA</p>
              <h1 className="text-3xl sm:text-4xl font-black text-white leading-tight">
                Gestión inteligente de facturas y trazabilidad de tránsito.
              </h1>
              <p className="text-slate-200 text-sm leading-6 max-w-xl">
                Accede con un perfil de demo para revisar el flujo completo: captura, validación, historiales y panel de administración.
              </p>
            </div>
          </div>

          <div className="mt-8 grid gap-3">
            {[
              { title: 'Mensajero', subtitle: 'Captura facturas y revisa tus registros.', icon: '📸' },
              { title: 'Administrador', subtitle: 'Revisa todo el sistema y exporta reportes.', icon: '🛡️' }
            ].map((item) => (
              <div key={item.title} className="rounded-2xl bg-white/5 border border-white/10 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{item.icon}</span>
                  <div>
                    <p className="text-sm font-bold text-white">{item.title}</p>
                    <p className="text-xs text-slate-200">{item.subtitle}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-7 sm:px-8 sm:py-8 bg-[#F8FBFF]">
          <div className="flex items-center justify-between gap-4 mb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-[#003366] font-bold">Acceso de usuarios</p>
              <h2 className="text-xl font-black text-[#003366] mt-1">Selecciona una cuenta</h2>
            </div>
            <div className="rounded-full bg-[#E6F6FD] px-3 py-1 text-[11px] font-bold text-[#003366]">
              Demo rápido
            </div>
          </div>

          <div className="flex gap-2 mb-5">
            {['all', 'mensajero', 'admin'].map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => setRolFiltro(tipo)}
                className={`px-3 py-2 rounded-full text-xs font-bold transition-all ${rolFiltro === tipo ? 'bg-[#003366] text-white shadow-sm' : 'bg-white text-[#003366] border border-gray-200 hover:border-[#00ADEF]'}`}
              >
                {tipo === 'all' ? 'Todos' : ROLE_META[tipo].label}
              </button>
            ))}
          </div>

          <div className="grid gap-3 mb-5">
            {cuentasVisibles.map((cuenta) => (
              <button
                key={cuenta.email}
                type="button"
                onClick={() => usarCuentaDemo(cuenta)}
                className="text-left rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm hover:border-[#00ADEF] hover:-translate-y-0.5 transition-all"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-[#E6F6FD] text-[#003366] font-black flex items-center justify-center">
                      {obtenerIniciales(cuenta.nombre)}
                    </div>
                    <div>
                      <p className="font-bold text-[#003366]">{cuenta.nombre}</p>
                      <p className="text-[11px] text-gray-500">{cuenta.email}</p>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${ROLE_META[cuenta.role].badge}`}>
                    {ROLE_META[cuenta.role].label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Campo label="Usuario">
              <input
                type="text"
                value={usuario}
                onChange={(e) => { setUsuario(e.target.value); setError(''); }}
                placeholder="Escribe tu usuario"
                className={inputClase()}
              />
            </Campo>

            <Campo label="Contraseña">
              <div className="relative">
                <input
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  className={`${inputClase()} pr-28`}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setMostrarPassword((actual) => !actual)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-[#003366]"
                >
                  {mostrarPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </Campo>

            {error && (
              <div className="flex items-center gap-2 text-red-600 text-xs bg-red-50 rounded-lg px-3 py-2 border border-red-100">
                <AlertCircle size={14} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={cargando}
              className="w-full bg-gradient-to-r from-[#00ADEF] to-[#0098D4] hover:opacity-95 disabled:opacity-60 text-white
                         font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2
                         text-sm shadow-lg active:scale-95 transition-all mt-2"
            >
              {cargando
                ? <><Loader2 className="animate-spin" size={16} /> Iniciando sesión...</>
                : <><LogIn size={16} /> Iniciar sesión</>
              }
            </button>
          </form>

          <div className="mt-5 rounded-2xl bg-[#E6F6FD] border border-[#BCE5F7] px-4 py-3 text-[11px] text-slate-700">
            <p className="font-bold text-[#003366] mb-1">Consejo</p>
            <p>Usa una cuenta de demo para probar el flujo según tu rol. El administrador tendrá acceso al módulo de reportes y exportación.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pantalla: Acceso Denegado ───────────────────────────────────────────────

function PantallaAccesoDenegado({ onVolver }) {
  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col items-center justify-center p-6 text-center">
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 border border-red-100 flex flex-col items-center gap-4">
        <div className="bg-red-50 text-red-500 rounded-full p-4">
          <AlertCircle size={48} />
        </div>
        <h2 className="text-xl font-bold text-[#003366]">Acceso denegado</h2>
        <p className="text-gray-500 text-sm">
          No tienes permisos suficientes para acceder al Módulo Administrador. Esta sección está protegida.
        </p>
        <button
          onClick={onVolver}
          className="w-full bg-[#00ADEF] hover:bg-[#0098D4] text-white font-semibold py-2.5 rounded-lg text-sm transition-all mt-2"
        >
          Volver al Inicio
        </button>
      </div>
    </div>
  );
}

// ─── Componente: Historial de Cargas del Mensajero ────────────────────────────

function HistorialMensajero({ usuario }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [imagenPreview, setImagenPreview] = useState(null);

  const cargarFacturas = async () => {
    setCargando(true);
    setError('');
    try {
      const json = await fetchJSON('/api/facturas', {
        headers: { 'Authorization': `Bearer ${usuario.token}` }
      });
      setFacturas(json.facturas);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarFacturas();
  }, [usuario]);

  return (
    <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-100 p-5 mt-4">
      <h3 className="font-bold text-[#003366] text-sm mb-3 flex items-center gap-2">
        <FileText size={16} className="text-[#00ADEF]" />
        Mis Cargas Recientes
      </h3>

      {cargando ? (
        <div className="flex items-center justify-center py-6 text-gray-400 text-xs">
          <Loader2 className="animate-spin mr-2" size={16} />
          <span>Cargando tus cargas...</span>
        </div>
      ) : error ? (
        <div className="text-red-500 text-[11px] py-2">{error}</div>
      ) : facturas.length === 0 ? (
        <div className="text-center py-6 text-gray-400 text-xs">
          Aún no has registrado ninguna factura.
        </div>
      ) : (
        <>
          <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
            {facturas.map((f, i) => {
              const documento = obtenerDocumento(f);
              return (
                <div key={f.id || i} className="p-3 bg-[#F8FAFC] rounded-xl border border-gray-100 text-xs">
                  <div className="flex justify-between gap-3 items-start">
                    <div>
                      <div className="flex gap-2 items-center">
                        <span className="font-mono font-black text-[#003366] tracking-wider bg-white border border-gray-200 px-1.5 py-0.5 rounded text-[10px]">
                          {f.placa}
                        </span>
                        <span className="text-gray-400 font-semibold">{f.organismo_transito}</span>
                      </div>
                      <div className="text-[10px] text-gray-400 mt-1 space-y-0.5">
                        <div>Recibo: {f.numero_recibo} · Fecha: {f.fecha_recibo || '—'}</div>
                        <div>Cargado: {f.fecha_carga ? new Date(f.fecha_carga).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—'}</div>
                        <div>Método: {obtenerMetodoPago(f)}</div>
                      </div>
                    </div>
                    <div className="font-bold text-[#003366] text-right whitespace-nowrap">
                      {formatearMoneda(f.valor_tramite)}
                    </div>
                  </div>
                  {documento && (
                    <div className="mt-3 rounded-lg overflow-hidden border border-gray-200 bg-white cursor-pointer transition-transform hover:scale-[1.01]"
                      onClick={() => setImagenPreview(documento)}
                    >
                      <img src={documento} alt={`Documento de ${f.placa}`} className="w-full h-24 object-cover" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {imagenPreview && (
            <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="relative max-w-4xl w-full max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-white">
                <button
                  onClick={() => setImagenPreview(null)}
                  className="absolute top-4 right-4 z-10 rounded-full bg-white/90 text-[#003366] p-2 shadow-sm hover:bg-white"
                  aria-label="Cerrar vista previa"
                >
                  ✕
                </button>
                <img
                  src={imagenPreview}
                  alt="Vista ampliada del documento"
                  className="w-full h-full max-h-[90vh] object-contain bg-[#111827]"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Componente: Visor de Cámara en Vivo con getUserMedia ─────────────────────

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState('');
  const [inicializado, setInicializado] = useState(false);

  useEffect(() => {
    async function iniciarCamara() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          },
          audio: false
        });
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          videoRef.current.play();
        }
        setInicializado(true);
      } catch (err) {
        console.error('Error al acceder a la cámara:', err);
        setError('No se pudo acceder a la cámara nativa. Por favor verifica los permisos o intenta desde la galería.');
      }
    }
    iniciarCamara();

    return () => {
      if (mediaStream => mediaStream.getTracks()) {
        // Safe check
      }
      // Cleanup tracks
    };
  }, []);

  // Handler for component unmount track stopping
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const tomarFoto = () => {
    if (!videoRef.current || !stream) return;
    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (stream) {
          stream.getTracks().forEach((track) => track.stop());
        }
        const file = new File([blob], 'factura_camara.jpg', { type: 'image/jpeg' });
        onCapture(file);
      }, 'image/jpeg', 0.95);
    } catch (err) {
      console.error('Error al tomar foto:', err);
      setError('Error al capturar la imagen de la cámara.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col justify-between p-4">
      {/* Cabecera del visor */}
      <div className="flex items-center justify-between text-white py-2 px-1">
        <h3 className="font-bold text-sm">Visor de Cámara Nativo</h3>
        <button
          onClick={onClose}
          className="text-gray-300 hover:text-white text-xs font-semibold px-3.5 py-1.5 bg-zinc-800 rounded-lg transition-colors"
        >
          Cancelar
        </button>
      </div>

      {/* Contenedor del video con guía de captura */}
      <div className="relative flex-1 rounded-2xl overflow-hidden bg-zinc-950 flex items-center justify-center border border-zinc-800">
        {error ? (
          <div className="p-6 text-center text-red-400 text-xs flex flex-col items-center gap-2">
            <AlertCircle size={32} />
            <p>{error}</p>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              className="w-full h-full object-cover"
            />
            {inicializado && (
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none p-6">
                {/* Cuadro de guía de recibo */}
                <div className="m-auto w-11/12 aspect-[3/4] border-2 border-dashed border-[#00ADEF]/60 rounded-xl relative">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black/85 text-[#00ADEF] font-bold text-[9px] px-2.5 py-1 rounded-full whitespace-nowrap uppercase tracking-wider">
                    Alinea el recibo aquí
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Botones de acción */}
      <div className="py-4 flex justify-center items-center">
        {!error && inicializado && (
          <button
            onClick={tomarFoto}
            className="w-16 h-16 bg-white hover:bg-zinc-100 rounded-full flex items-center justify-center border-4 border-zinc-300 shadow-xl active:scale-90 transition-all"
            aria-label="Tomar foto"
          >
            <div className="w-12 h-12 bg-red-600 rounded-full hover:bg-red-700 transition-colors" />
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Pantalla: Panel principal del mensajero ──────────────────────────────────

function PanelMensajero({ usuario, onOcrExitoso, onLogout, onVerAdmin }) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [camaraActiva, setCamaraActiva] = useState(false);

  const inputGaleriaRef = useRef(null);
  const rol = ROLE_META[usuario.role] || ROLE_META.mensajero;

  const procesarArchivo = async (archivo) => {
    if (!archivo) return;
    const urlTemporal = URL.createObjectURL(archivo);
    setPreviewUrl(urlTemporal);
    setCargando(true);
    setError('');
    try {
      const body = new FormData();
      body.append('imagen', archivo);
      const json = await fetchJSON('/api/procesar-factura', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${usuario.token}` },
        body
      });
      onOcrExitoso(json);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
      URL.revokeObjectURL(urlTemporal);
      setPreviewUrl(null);
    }
  };

  const handleCambioInput = (e) => {
    procesarArchivo(e.target.files[0]);
    e.target.value = '';
  };

  const handleCameraCapture = (file) => {
    setCamaraActiva(false);
    procesarArchivo(file);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">
      {/* Visor de cámara en vivo */}
      {camaraActiva && (
        <CameraCapture
          onCapture={handleCameraCapture}
          onClose={() => setCamaraActiva(false)}
        />
      )}

      <header className="bg-[linear-gradient(135deg,_#003366,_#005490)] text-white px-5 py-4 shadow-md">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <LogoSINTRA variant="light" />
            <div className="hidden sm:block h-10 border-l border-white/15" />
            <div>
              <p className="text-[11px] uppercase tracking-[0.25em] text-[#7FCDEE] font-bold">Sesión activa</p>
              <p className="text-base font-bold">{usuario.nombre}</p>
              <p className="text-sm text-slate-200">{rol.label}</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {usuario.role === 'admin' ? (
              <button
                onClick={onVerAdmin}
                className="inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-all"
                title="Panel de Administración"
              >
                <LayoutDashboard size={16} />
                <span>Administrador</span>
              </button>
            ) : (
              <span className="inline-flex items-center gap-2 rounded-full bg-[#E6F6FD] px-4 py-2 text-sm font-semibold text-[#003366]">
                <FileText size={16} />
                Acceso Mensajero
              </span>
            )}
            <button
              onClick={onLogout}
              className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white hover:bg-white/10 transition-all"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
      </header>

      {/* Sin capture -> selector de archivos / galería */}
      <input ref={inputGaleriaRef} type="file" accept="image/*" onChange={handleCambioInput} className="hidden" aria-hidden="true" />

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-6 w-full">
        <div className="w-full max-w-3xl rounded-[28px] bg-white border border-gray-100 shadow-[0_24px_60px_rgba(0,0,0,0.08)] px-5 py-5 sm:px-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#00ADEF]">{rol.label}</p>
              <h2 className="text-2xl sm:text-3xl font-black text-[#003366] mt-2">
                {usuario.role === 'admin' ? 'Monitorea el flujo completo de facturas.' : 'Captura y valida recibos de tránsito en segundos.'}
              </h2>
              <p className="text-sm text-gray-500 mt-2 leading-6">
                {rol.description}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-[#E6F6FD] px-4 py-3 text-[#003366]">
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold">Rol</p>
                <p className="font-black text-lg">{rol.label}</p>
              </div>
              <div className="rounded-2xl bg-[#F4F7F9] px-4 py-3 text-[#003366]">
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold">Usuario</p>
                <p className="font-black text-lg">{obtenerIniciales(usuario.nombre)}</p>
              </div>
            </div>
          </div>
        </div>

        {cargando ? (
          <div className="flex flex-col items-center gap-5 text-center">
            <div className="relative w-52 h-40 rounded-2xl overflow-hidden shadow-lg bg-[#E6F6FD]">
              {previewUrl
                ? <img src={previewUrl} alt="Factura capturada" className="w-full h-full object-cover" />
                : <div className="w-full h-full bg-[#E6F6FD]" />
              }
              <div className="absolute inset-0 bg-[#003366]/60 flex items-center justify-center">
                <Loader2 className="animate-spin text-white" size={36} />
              </div>
            </div>
            <div>
              <p className="font-bold text-[#003366] text-lg">Analizando documento con OCR</p>
              <p className="text-gray-500 text-sm mt-1">Por favor espera, esto puede tardar unos segundos.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="w-full max-w-4xl grid lg:grid-cols-[1.1fr_0.9fr] gap-6 items-stretch">
              <div className="rounded-[28px] bg-gradient-to-br from-[#00ADEF] to-[#7FCDEE] text-white p-6 shadow-[0_24px_60px_rgba(0,173,239,0.25)]">
                <p className="text-[11px] uppercase tracking-[0.2em] font-bold text-white/80">Nueva captura</p>
                <h3 className="text-2xl font-black mt-3">Captura tu factura con cámara o galería</h3>
                <p className="text-sm text-white/90 mt-3 leading-6">
                  Sube una imagen o toma una fotografía con la cámara nativa. El sistema te guiará al flujo de validación y guardado.
                </p>
                <div className="mt-5 flex flex-wrap gap-3">
                  <button
                    onClick={() => setCamaraActiva(true)}
                    className="inline-flex items-center gap-2 rounded-xl bg-white text-[#003366] px-4 py-3 font-bold shadow-lg hover:scale-[1.01] transition-all"
                  >
                    <Camera size={18} />
                    Abrir cámara
                  </button>
                  <button
                    onClick={() => inputGaleriaRef.current.click()}
                    className="inline-flex items-center gap-2 rounded-xl border border-white/70 px-4 py-3 font-bold hover:bg-white/10 transition-all"
                  >
                    <FileText size={18} />
                    Seleccionar desde galería
                  </button>
                </div>
              </div>

              <div className="rounded-[28px] bg-white border border-gray-100 shadow-[0_24px_60px_rgba(0,0,0,0.08)] p-5">
                <p className="text-[11px] uppercase tracking-[0.2em] text-[#003366] font-bold">Atajos</p>
                <div className="mt-4 space-y-3">
                  {[
                    { title: 'Historial de cargas', text: 'Revisa tus facturas más recientes y su estado.' },
                    { title: 'Control de calidad', text: 'Confirma datos OCR y corrige lo necesario.' },
                    { title: 'Exportación', text: 'Consulta reportes y monitorea el flujo del día.' }
                  ].map((item) => (
                    <div key={item.title} className="rounded-2xl bg-[#F8FBFF] border border-gray-100 p-3">
                      <p className="font-bold text-[#003366]">{item.title}</p>
                      <p className="text-sm text-gray-500 mt-1">{item.text}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <HistorialMensajero usuario={usuario} />
          </>
        )}

        {error && (
          <div className="w-full max-w-md bg-red-50 border border-red-200 text-red-700 rounded-xl
                          px-4 py-3 text-sm flex items-start gap-2">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </main>

      <FooterApp />
    </div>
  );
}

// ─── Pantalla: Formulario de validación ──────────────────────────────────────

function FormularioValidacion({ datosOCR, usuario, onVolver, onGuardado }) {
  const { camposSugeridos, confianzaOCR, imagen_original } = datosOCR;

  const [form, setForm] = useState({
    organismo_transito: camposSugeridos.organismo_transito || '',
    placa: camposSugeridos.placa || '',
    valor_tramite: camposSugeridos.valor_tramite || '',
    numero_recibo: camposSugeridos.numero_recibo || '',
    fecha_recibo: camposSugeridos.fecha_recibo || '',
    tipo_tramite_seleccion: 'Matrícula inicial',
    tipo_tramite_otro: '',
    payment_method: 'efectivo',
    datos_ocr: { confianzaOCR, textoCompleto: datosOCR.textoCompleto },
    imagen_original: imagen_original || ''
  });
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [exito, setExito] = useState(false);

  const set = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleGuardar = async (e) => {
    e.preventDefault();
    setCargando(true);
    setError('');
    try {
      const tipoTramiteSeleccionado = form.tipo_tramite_seleccion === 'Otros'
        ? form.tipo_tramite_otro.trim()
        : form.tipo_tramite_seleccion;

      await fetchJSON('/api/guardar-factura', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${usuario.token}`
        },
        body: JSON.stringify({
          ...form,
          tipo_tramite: tipoTramiteSeleccionado
        }),
      });
      setExito(true);
      setTimeout(() => onGuardado(), 1500);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const colorConfianza =
    confianzaOCR >= 75 ? 'text-green-700 bg-green-50 border-green-200'
      : confianzaOCR >= 50 ? 'text-yellow-700 bg-yellow-50 border-yellow-200'
        : 'text-red-600 bg-red-50 border-red-200';

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">

      <header className="bg-[#003366] text-white px-4 py-3.5 flex items-center gap-3 shadow-md">
        <button
          onClick={onVolver}
          className="p-1.5 rounded-lg hover:bg-[#004080] transition-colors"
          aria-label="Volver"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1">
          <h1 className="font-bold text-base leading-none">Validar Documento</h1>
          <p className="text-[#7FCDEE] text-xs mt-0.5">Confirma los campos detectados por el OCR</p>
        </div>
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${colorConfianza}`}>
          OCR {confianzaOCR}%
        </span>
      </header>

      <form onSubmit={handleGuardar} className="flex-1 p-4 pb-8 max-w-lg mx-auto w-full">

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">

          <Campo label="Organismo de Tránsito">
            <input
              type="text"
              value={form.organismo_transito}
              onChange={set('organismo_transito')}
              placeholder="Ej: Tránsito de Medellín, SIMIT, etc."
              className={inputClase()}
              required
            />
          </Campo>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Placa">
              <input
                type="text"
                value={form.placa}
                onChange={(e) => setForm((f) => ({ ...f, placa: e.target.value.toUpperCase() }))}
                placeholder="ABC123"
                maxLength={7}
                className={inputClase('tracking-[0.2em] font-mono text-center font-bold')}
                required
              />
              {!form.placa && (
                <div className="text-red-500 text-[11px] mt-1.5 font-medium flex items-center gap-1">
                  <AlertCircle size={12} className="shrink-0" />
                  <span>No se encontró resultado</span>
                </div>
              )}
            </Campo>
            <Campo label="Número de Recibo">
              <input
                type="text"
                value={form.numero_recibo}
                onChange={set('numero_recibo')}
                placeholder="001234"
                className={inputClase()}
                required
              />
            </Campo>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Campo label="Valor del Trámite">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none font-semibold">$</span>
                <input
                  type="number"
                  value={form.valor_tramite}
                  onChange={set('valor_tramite')}
                  placeholder="150000"
                  min="0"
                  className={inputClase('pl-7')}
                  required
                />
              </div>
            </Campo>
            <Campo label="Fecha del Recibo">
              <input
                type="date"
                value={form.fecha_recibo}
                onChange={set('fecha_recibo')}
                className={inputClase()}
                required
              />
            </Campo>
          </div>

          <Campo label="Tipo de trámite">
            <select
              value={form.tipo_tramite_seleccion}
              onChange={(e) => setForm((f) => ({ ...f, tipo_tramite_seleccion: e.target.value }))}
              className={inputClase()}
              required
            >
              <option value="Matrícula inicial">Matrícula inicial</option>
              <option value="Traspaso">Traspaso</option>
              <option value="Otros">Otros</option>
            </select>
          </Campo>

          {form.tipo_tramite_seleccion === 'Otros' && (
            <Campo label="Especificar tipo de trámite">
              <input
                type="text"
                value={form.tipo_tramite_otro}
                onChange={(e) => setForm((f) => ({ ...f, tipo_tramite_otro: e.target.value }))}
                placeholder="Escribe el tipo de trámite"
                className={inputClase()}
                required
              />
            </Campo>
          )}

          <Campo label="Método de Pago">
            <select
              value={form.payment_method}
              onChange={(e) => setForm((f) => ({ ...f, payment_method: e.target.value }))}
              className={inputClase()}
              required
            >
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </Campo>

          {/* Vista previa pequeña de la imagen capturada */}
          {imagen_original && (
            <Campo label="Imagen Capturada">
              <div className="relative rounded-lg overflow-hidden border border-gray-200 h-28 bg-[#F4F7F9]">
                <img src={imagen_original} alt="Vista previa del recibo" className="w-full h-full object-cover" />
              </div>
            </Campo>
          )}

          {/* Información automática no editable que el backend validará */}
          <div className="bg-[#F8FAFC] rounded-lg p-3 text-[11px] text-gray-400 space-y-1 border border-gray-100">
            <p><strong>Mensajero (Inyectado):</strong> {usuario.nombre}</p>
            <p><strong>ID Mensajero:</strong> {usuario.email}</p>
            <p><strong>Fecha y Hora de Carga:</strong> Automático del sistema al guardar</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700
                          rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            {error}
          </div>
        )}

        {exito && (
          <div className="mt-4 flex items-center gap-2 bg-green-50 border border-green-200
                          text-green-700 rounded-xl px-4 py-3 text-sm font-semibold">
            <CheckCircle size={18} className="shrink-0" />
            ¡Factura guardada correctamente!
          </div>
        )}

        <button
          type="submit"
          disabled={cargando || exito}
          className="mt-5 w-full bg-[#00ADEF] hover:bg-[#0098D4] disabled:opacity-60 text-white
                     font-semibold py-4 rounded-xl flex items-center justify-center gap-2
                     text-base active:scale-95 transition-all shadow-md"
        >
          {cargando
            ? <><Loader2 className="animate-spin" size={20} /> Guardando...</>
            : exito
              ? <><CheckCircle size={20} /> ¡Guardado!</>
              : <><Save size={20} /> Confirmar y Guardar</>
          }
        </button>
      </form>

      <FooterApp />
    </div>
  );
}

// ─── Pantalla: Panel de Administración ───────────────────────────────────────

function PanelAdmin({ usuario, onVolver }) {
  const [facturas, setFacturas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [filtro, setFiltro] = useState('');
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
  // Fondo operativo editable por administrador (persistido en localStorage)
  const [presupuestoOperativo, setPresupuestoOperativo] = useState(() => {
    try {
      const v = localStorage.getItem('sintra_presupuesto_operativo');
      return v ? Number(v) : PRESUPUESTO_OPERATIVO;
    } catch (e) {
      return PRESUPUESTO_OPERATIVO;
    }
  });
  const [ultimaEdicionMeta, setUltimaEdicionMeta] = useState(() => {
    try {
      const m = localStorage.getItem('sintra_presupuesto_meta');
      return m ? JSON.parse(m) : null;
    } catch (e) {
      return null;
    }
  });
  // Imagen preview (reutilizado) y filtros avanzados (un único estado)
  const [imagenPreview, setImagenPreview] = useState(null);
  const [filtrosAvanzados, setFiltrosAvanzados] = useState({ usuario: '', tipo: '', desde: '', hasta: '', metodo: '' });

  const cargarFacturas = async () => {
    setCargando(true);
    setError('');
    try {
      const json = await fetchJSON('/api/admin/facturas', {
        headers: { 'Authorization': `Bearer ${usuario.token}` }
      });
      setFacturas(json.facturas);
      setUltimaActualizacion(new Date());
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  };

  const eliminarFactura = async (id) => {
    if (!window.confirm('¿Está seguro de que desea eliminar permanentemente este registro?')) return;
    try {
      await fetchJSON(`/api/admin/facturas/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${usuario.token}` }
      });
      cargarFacturas();
    } catch (err) {
      alert(err.message);
    }
  };

  useEffect(() => { cargarFacturas(); }, [usuario]);

  useEffect(() => {
    const intervalo = window.setInterval(() => {
      cargarFacturas();
    }, 30000);

    return () => window.clearInterval(intervalo);
  }, [usuario]);

  const facturasFiltradas = facturas.filter((f) => {
    const q = filtro.toLowerCase();
    // Búsqueda global (ya existente)
    const matchGlobal = (
      f.placa?.toLowerCase().includes(q) ||
      f.organismo_transito?.toLowerCase().includes(q) ||
      f.numero_recibo?.toLowerCase().includes(q) ||
      (f.mensajero || '').toLowerCase().includes(q) ||
      obtenerMetodoPago(f).toLowerCase().includes(q)
    );

    // Filtros avanzados: usuario, tipo, método, rango de fecha
    const { usuario: filtroUsuario, tipo: filtroTipo, desde, hasta, metodo: filtroMetodo } = filtrosAvanzados;
    if (filtroUsuario && !( (f.mensajero||'').toLowerCase().includes(String(filtroUsuario).toLowerCase()) )) return false;
    if (filtroTipo && !( String(obtenerTipoTramite(f)).toLowerCase().includes(String(filtroTipo).toLowerCase()) )) return false;
    if (filtroMetodo && !( obtenerMetodoPago(f).toLowerCase().includes(String(filtroMetodo).toLowerCase()) )) return false;
    if (desde) {
      const d = new Date(desde);
      const fecha = f.fecha_carga ? new Date(f.fecha_carga) : null;
      if (!fecha || fecha < d) return false;
    }
    if (hasta) {
      const h = new Date(hasta);
      const fecha = f.fecha_carga ? new Date(f.fecha_carga) : null;
      if (!fecha || fecha > new Date(h.getFullYear(), h.getMonth(), h.getDate(), 23,59,59,999)) return false;
    }

    return matchGlobal;
  });

  const totalTramites = facturasFiltradas.length;
  const totalGastado = facturasFiltradas.reduce((sum, f) => sum + (f.valor_tramite || 0), 0);
  // Usar el presupuesto operativo editable para los cálculos
  const fondoDisponible = Math.max(presupuestoOperativo - totalGastado, 0);
  const consumoPorcentaje = Math.min((totalGastado / (presupuestoOperativo || 1)) * 100, 100);

  const estadisticasPorTipo = useMemo(() => {
    const mapa = {};
    facturasFiltradas.forEach((f) => {
      const tipo = obtenerTipoTramite(f);
      mapa[tipo] = (mapa[tipo] || 0) + 1;
    });

    return Object.entries(mapa)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [facturasFiltradas]);

  const estadisticasPorMensajero = useMemo(() => {
    const mapa = {};
    facturasFiltradas.forEach((f) => {
      const nombre = f.mensajero || 'Sin asignar';
      mapa[nombre] = (mapa[nombre] || 0) + 1;
    });

    return Object.entries(mapa)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [facturasFiltradas]);

  const estadisticasPago = useMemo(() => {
    const mapa = { efectivo: 0, transferencia: 0, tarjeta: 0, no_especificado: 0 };
    facturasFiltradas.forEach((f) => {
      const metodo = (f.payment_method || f.datos_ocr?.payment_method || 'no_especificado').toLowerCase();
      mapa[metodo] = (mapa[metodo] || 0) + 1;
    });

    return Object.entries(mapa)
      .filter(([, value]) => value > 0)
      .map(([name, value]) => ({ name: METODOS_PAGO[name] || name, value }));
  }, [facturasFiltradas]);

  const colores = ['#00ADEF', '#003366', '#7FCDEE', '#0EA5E9', '#1D4ED8'];

  // Listas únicas para filtros (se generan a partir de los registros existentes)
  const usuariosUnicos = Array.from(new Set(facturas.map((f) => f.mensajero || 'Sin asignar'))).filter(Boolean).sort();
  const tiposUnicos = Array.from(new Set(facturas.map((f) => obtenerTipoTramite(f) || 'Sin tipo'))).filter(Boolean).sort();
  const metodosUnicos = Array.from(new Set(facturas.map((f) => obtenerMetodoPago(f) || 'No especificado'))).filter(Boolean).sort();

  const exportarCSV = () => {
    const encabezados = ['Fecha Registro', 'Usuario', 'Organismo de Tránsito', 'Placa', 'Número Recibo', 'Valor Trámite', 'Método de Pago', 'Tipo de Trámite'];
    const filas = facturasFiltradas.map((f) => [
      f.fecha_carga ? new Date(f.fecha_carga).toLocaleString('es-CO') : '',
      f.mensajero ?? '',
      f.organismo_transito ?? '',
      f.placa ?? '',
      f.numero_recibo ?? '',
      f.valor_tramite ?? 0,
      obtenerMetodoPago(f),
      obtenerTipoTramite(f),
    ]);
    const csv = [encabezados, ...filas]
      .map((fila) => fila.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\r\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_sintra_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Guardar presupuesto y meta en localStorage
  const guardarPresupuesto = (nuevo) => {
    try {
      localStorage.setItem('sintra_presupuesto_operativo', String(nuevo));
      setPresupuestoOperativo(nuevo);
      const meta = { editor: usuario?.nombre || usuario?.email || '—', at: new Date().toISOString() };
      localStorage.setItem('sintra_presupuesto_meta', JSON.stringify(meta));
      setUltimaEdicionMeta(meta);
    } catch (e) {
      console.error('No se pudo guardar presupuesto:', e);
    }
  };

  const editarFondoBase = () => {
    const valor = window.prompt('Define el valor del fondo operativo (solo números):', String(presupuestoOperativo));
    if (!valor) return;
    const nuevoValor = Number(valor.replace(/[^0-9]/g, ''));
    if (Number.isNaN(nuevoValor) || nuevoValor <= 0) {
      alert('Ingresa un valor válido mayor que cero.');
      return;
    }
    guardarPresupuesto(nuevoValor);
  };

  return (
    <div className="min-h-screen bg-[#F4F7F9] flex flex-col">

      <header className="bg-[#003366] text-white px-6 py-3.5 flex items-center gap-4 shadow-md">
        <button
          onClick={onVolver}
          className="p-1.5 rounded-lg hover:bg-[#004080] transition-colors"
          aria-label="Volver al panel mensajero"
        >
          <ChevronLeft size={22} />
        </button>
        <div className="flex-1 flex items-center gap-3">
          <LogoSINTRA variant="light" />
          <span className="text-[#7FCDEE] text-xs hidden sm:inline truncate">· Módulo Administrador</span>
        </div>
        <button
          onClick={cargarFacturas}
          disabled={cargando}
          className="text-[#7FCDEE] hover:text-white transition-colors disabled:opacity-40"
          title="Recargar datos"
        >
          <RefreshCw size={18} className={cargando ? 'animate-spin' : ''} />
        </button>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-5">

        <div className="grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Dashboard avanzado</p>
                <h2 className="text-lg font-black text-[#003366]">Control operacional en tiempo real</h2>
              </div>
              <div className="text-right">
                <p className="text-[11px] text-gray-400">Actualización</p>
                <p className="text-sm font-semibold text-[#003366]">
                  {ultimaActualizacion
                    ? ultimaActualizacion.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 mt-3">
              Monitorea el volumen, el consumo de fondo y la actividad de cada usuario con visualizaciones modernas y filtros activos.
            </p>
          </div>

          <div className="bg-[#003366] rounded-2xl shadow-sm p-5 text-white">
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-white/10 p-3">
                <Wallet size={20} className="text-[#7FCDEE]" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-[#7FCDEE]">Fondo disponible</p>
                <p className="text-2xl font-black mt-1">{formatearMoneda(fondoDisponible)}</p>
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="text-[11px] text-[#7FCDEE]">Fondo base actual: <span className="font-semibold">{formatearMoneda(presupuestoOperativo)}</span></div>
              {ultimaEdicionMeta && (
                <div className="text-[11px] text-[#D9F7FF] leading-5">
                  Última edición del fondo base realizada por <span className="font-semibold text-white">{ultimaEdicionMeta.editor}</span> el <span className="font-semibold text-white">{new Date(ultimaEdicionMeta.at).toLocaleDateString('es-CO')}</span> a las <span className="font-semibold text-white">{new Date(ultimaEdicionMeta.at).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              )}
              <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-[#00ADEF]" style={{ width: `${consumoPorcentaje}%` }} />
              </div>
              <div className="flex items-center justify-between text-[11px] text-[#7FCDEE] mt-2">
                <span>{consumoPorcentaje.toFixed(1)}% consumido</span>
                <span>{formatearMoneda(totalGastado)} gastados</span>
              </div>
              <button
                type="button"
                onClick={editarFondoBase}
                className="mt-3 inline-flex items-center justify-center rounded-full bg-white text-[#003366] px-4 py-2 text-sm font-semibold shadow-sm hover:bg-gray-50 transition-all"
              >
                Editar fondo base
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-gray-400">Valor total</p>
              <ReceiptText size={18} className="text-[#00ADEF]" />
            </div>
            <p className="text-2xl font-black text-[#003366] mt-3">{formatearMoneda(totalGastado)}</p>
            <p className="text-xs text-gray-500 mt-1">trámites filtrados en el dashboard</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-gray-400">Volumen</p>
              <FileText size={18} className="text-[#00ADEF]" />
            </div>
            <p className="text-2xl font-black text-[#003366] mt-3">{facturasFiltradas.length}</p>
            <p className="text-xs text-gray-500 mt-1">documentos gestionados</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-gray-400">Usuarios</p>
              <Users size={18} className="text-[#00ADEF]" />
            </div>
            <p className="text-2xl font-black text-[#003366] mt-3">{estadisticasPorMensajero.length}</p>
            <p className="text-xs text-gray-500 mt-1">activos en la selección actual</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-gray-400">Método más usado</p>
              <Banknote size={18} className="text-[#00ADEF]" />
            </div>
            <p className="text-2xl font-black text-[#003366] mt-3">
              {estadisticasPago.length > 0
                ? estadisticasPago.sort((a, b) => b.value - a.value)[0].name
                : '—'}
            </p>
            <p className="text-xs text-gray-500 mt-1">seguimiento por forma de pago</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">Métodos de pago</p>
                <h3 className="font-bold text-[#003366]">Detalle del pago por trámite</h3>
              </div>
              <span className="text-[11px] text-[#00ADEF] font-semibold">Actualizado</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={estadisticasPago} dataKey="value" nameKey="name" innerRadius={55} outerRadius={80} paddingAngle={3}>
                    {estadisticasPago.map((entry, index) => (
                      <Cell key={entry.name} fill={colores[index % colores.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }} formatter={(value, name) => [`${value} trámites`, name]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {estadisticasPago.map((item, index) => (
                <div key={item.name} className="rounded-xl bg-[#F8FBFF] px-3 py-2 border border-gray-100">
                  <div className="flex items-center gap-2 text-[11px] text-gray-500">
                    <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: colores[index % colores.length] }} />
                    {item.name}
                  </div>
                  <p className="mt-1 font-black text-[#003366]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-xs uppercase tracking-wider text-gray-400">Trámites por tipo</p>
                <h3 className="font-bold text-[#003366]">Participación por tipo de trámite</h3>
              </div>
              <span className="text-[11px] text-[#00ADEF] font-semibold">Total {totalTramites}</span>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={estadisticasPorTipo}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={55}
                    outerRadius={80}
                    paddingAngle={4}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {estadisticasPorTipo.map((entry, index) => (
                      <Cell key={entry.name} fill={colores[index % colores.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }} formatter={(value, name, props) => [`${value} trámites`, `${name} • ${(props.percent * 100).toFixed(1)}%`]} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs uppercase tracking-wider text-gray-400">Trámites por usuario</p>
              <h3 className="font-bold text-[#003366]">Cantidad de trámites por usuario</h3>
            </div>
            <span className="text-[11px] text-[#00ADEF] font-semibold">Live</span>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={estadisticasPorMensajero}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#EEF2F7" />
                <XAxis dataKey="name" tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fill: '#64748B', fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 12, borderColor: '#E2E8F0' }} formatter={(valor) => [`${valor} trámites`, 'Usuario']} />
                <Bar dataKey="count" radius={[12, 12, 0, 0]} fill="#00ADEF" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Controles: filtro + exportar */}
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="w-full">
            <div className="flex flex-wrap gap-2 mb-2">
              <select
                value={filtrosAvanzados.usuario}
                onChange={(e) => setFiltrosAvanzados((p) => ({ ...p, usuario: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                aria-label="Filtrar por usuario"
              >
                <option value="">Todos los usuarios</option>
                {usuariosUnicos.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>

              <select
                value={filtrosAvanzados.tipo}
                onChange={(e) => setFiltrosAvanzados((p) => ({ ...p, tipo: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                aria-label="Filtrar por tipo"
              >
                <option value="">Todos los tipos</option>
                {tiposUnicos.map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <select
                value={filtrosAvanzados.metodo}
                onChange={(e) => setFiltrosAvanzados((p) => ({ ...p, metodo: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                aria-label="Filtrar por método"
              >
                <option value="">Todos los métodos</option>
                {metodosUnicos.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>

              <input
                type="date"
                value={filtrosAvanzados.desde}
                onChange={(e) => setFiltrosAvanzados((p) => ({ ...p, desde: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                aria-label="Desde fecha"
              />

              <input
                type="date"
                value={filtrosAvanzados.hasta}
                onChange={(e) => setFiltrosAvanzados((p) => ({ ...p, hasta: e.target.value }))}
                className="text-sm border border-gray-200 rounded px-2 py-1 bg-white"
                aria-label="Hasta fecha"
              />

              <button
                type="button"
                onClick={() => setFiltrosAvanzados({ usuario: '', tipo: '', desde: '', hasta: '', metodo: '' })}
                className="text-sm text-[#003366] bg-white/10 px-2 py-1 rounded"
                title="Limpiar filtros"
              >Limpiar</button>
            </div>

            <div className="relative w-full sm:max-w-xs">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={filtro}
                onChange={(e) => setFiltro(e.target.value)}
                placeholder="Buscar por placa, organismo, usuario o método"
                className="w-full border border-gray-200 rounded-lg pl-9 pr-4 py-2.5 text-sm bg-white shadow-sm focus:outline-none focus:ring-2 focus:ring-[#00ADEF]"
              />
            </div>
          </div>

          <button
            onClick={exportarCSV}
            disabled={facturasFiltradas.length === 0}
            className="flex items-center gap-2 bg-[#00ADEF] hover:bg-[#0098D4] disabled:opacity-50 text-white font-semibold px-5 py-2.5 rounded-lg text-sm transition-all active:scale-95 shadow-sm whitespace-nowrap"
          >
            <Download size={16} />
            Exportar a Excel / CSV
          </button>
        </div>

        {cargando && (
          <div className="flex items-center justify-center py-20 text-[#003366]">
            <Loader2 className="animate-spin mr-3" size={26} />
            <span className="font-semibold">Cargando registros...</span>
          </div>
        )}

        {!cargando && error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700
                          rounded-xl px-4 py-3 text-sm">
            <AlertCircle size={16} className="shrink-0" />
            {error}
          </div>
        )}

        {/* Tabla */}
        {!cargando && !error && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            {facturasFiltradas.length === 0 ? (
              <div className="text-center py-16 text-gray-400">
                <FileText size={40} className="mx-auto mb-3 text-gray-200" />
                <p className="font-semibold text-base">Sin resultados</p>
                <p className="text-sm mt-1">
                  {filtro ? 'Prueba con otro término de búsqueda.' : 'Aún no hay registros en el sistema.'}
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-[#F4F7F9] border-b border-gray-100">
                      {['Foto / Documento', 'Fecha Carga', 'Fecha Recibo', 'Usuario', 'Organismo', 'Placa', 'N° Recibo', 'Valor Trámite', 'Método de Pago', 'Acciones'].map((col) => (
                        <th key={col} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {facturasFiltradas.map((f, i) => {
                      const documento = obtenerDocumento(f);
                      return (
                        <tr
                          key={f.id ?? i}
                          className={`border-b border-gray-50 hover:bg-[#F0FAFF] transition-colors ${i % 2 !== 0 ? 'bg-gray-50/40' : ''}`}
                        >
                          <td className="px-4 py-3 whitespace-nowrap">
                            {documento ? (
                              <button
                                type="button"
                                onClick={() => setImagenPreview(documento)}
                                className="flex items-center gap-3 rounded-lg overflow-hidden border border-gray-200 bg-white p-0 transition-shadow hover:shadow-sm"
                                title="Abrir imagen"
                              >
                                <img src={documento} alt={`Documento ${f.placa}`} className="h-14 w-24 object-cover" />
                                <span className="text-[11px] text-gray-500">Adjunto</span>
                              </button>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-400 text-xs">
                                <ImageIcon size={16} />
                                <span>Sin documento</span>
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                            {f.fecha_carga
                              ? new Date(f.fecha_carga).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                            {f.fecha_recibo || '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-700 font-medium whitespace-nowrap">{f.mensajero}</td>
                          <td className="px-4 py-3 text-gray-600">{f.organismo_transito}</td>
                          <td className="px-4 py-3 font-mono font-bold tracking-widest text-[#003366]">{f.placa}</td>
                          <td className="px-4 py-3 text-gray-600">{f.numero_recibo}</td>
                          <td className="px-4 py-3 font-bold text-[#003366] whitespace-nowrap">
                            {formatearMoneda(f.valor_tramite)}
                          </td>
                          <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{obtenerMetodoPago(f)}</td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <button
                              onClick={() => eliminarFactura(f.id)}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded transition-all"
                              title="Eliminar Registro"
                            >
                              <Trash2 size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {imagenPreview && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="relative max-w-5xl w-full max-h-[90vh] overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-white">
              <button
                type="button"
                onClick={() => setImagenPreview(null)}
                className="absolute top-4 right-4 z-10 rounded-full bg-white/90 text-[#003366] p-2 shadow-sm hover:bg-white"
                aria-label="Cerrar imagen ampliada"
              >
                ✕
              </button>
              <img
                src={imagenPreview}
                alt="Vista ampliada del documento"
                className="w-full h-full max-h-[90vh] object-contain bg-[#111827]"
              />
            </div>
          </div>
        )}
      </main>

      <FooterApp />
    </div>
  );
}

// ─── App raíz — maneja el estado global, persistencia de sesión y flujo de pantallas ──────────────

export default function App() {
  const [pantalla, setPantalla] = useState('login');  // 'login' | 'panel' | 'formulario' | 'admin' | 'denegado'
  const [usuario, setUsuario] = useState(null);
  const [datosOCR, setDatosOCR] = useState(null);

  // Cargar sesión guardada de localStorage al arrancar
  useEffect(() => {
    const sesionGuardada = localStorage.getItem('sintra_session');
    if (sesionGuardada) {
      try {
        const user = JSON.parse(sesionGuardada);
        setUsuario(user);

        // Manejar enrutamiento según el path o mandar a panel por defecto
        const path = window.location.pathname;
        if (path === '/admin') {
          if (user.role === 'admin') {
            setPantalla('admin');
          } else {
            setPantalla('denegado');
          }
        } else {
          setPantalla('panel');
        }
      } catch (e) {
        localStorage.removeItem('sintra_session');
      }
    }
  }, []);

  // Interceptar cambios en el historial de navegación para control de accesos básico
  useEffect(() => {
    const manejarAccesoRuta = () => {
      const path = window.location.pathname;
      if (path === '/admin') {
        if (!usuario) {
          setPantalla('login');
        } else if (usuario.role !== 'admin') {
          setPantalla('denegado');
        } else {
          setPantalla('admin');
        }
      }
    };

    window.addEventListener('popstate', manejarAccesoRuta);
    return () => window.removeEventListener('popstate', manejarAccesoRuta);
  }, [usuario]);

  const handleLogin = (user) => {
    setUsuario(user);
    localStorage.setItem('sintra_session', JSON.stringify(user));

    // Si la URL es /admin y el rol es admin, mantener ahí, de lo contrario ir a panel
    if (window.location.pathname === '/admin' && user.role === 'admin') {
      setPantalla('admin');
    } else {
      setPantalla('panel');
    }
  };

  const handleLogout = () => {
    setUsuario(null);
    setDatosOCR(null);
    localStorage.removeItem('sintra_session');
    setPantalla('login');
    // Si la URL está en /admin, limpiarla para evitar redirección errónea al volver a abrir
    if (window.location.pathname === '/admin') {
      window.history.pushState({}, '', '/');
    }
  };

  const handleOcr = (json) => {
    setDatosOCR(json);
    setPantalla('formulario');
  };

  const handleGuardado = () => {
    setDatosOCR(null);
    setPantalla('panel');
  };

  const handleVerAdmin = () => {
    // Intentar cambiar ruta virtualmente
    window.history.pushState({}, '', '/admin');
    if (usuario && usuario.role === 'admin') {
      setPantalla('admin');
    } else {
      setPantalla('denegado');
    }
  };

  const handleVolverDeAdmin = () => {
    window.history.pushState({}, '', '/');
    setPantalla('panel');
  };

  // Renderizado según pantallas
  if (pantalla === 'login' && !usuario) {
    return <PantallaLogin onLogin={handleLogin} />;
  }

  // Si no hay usuario y no estamos en login, forzar login
  if (!usuario) {
    return <PantallaLogin onLogin={handleLogin} />;
  }

  if (pantalla === 'denegado') {
    return <PantallaAccesoDenegado onVolver={handleVolverDeAdmin} />;
  }

  if (pantalla === 'formulario' && datosOCR) {
    return <FormularioValidacion datosOCR={datosOCR} usuario={usuario} onVolver={() => setPantalla('panel')} onGuardado={handleGuardado} />;
  }

  if (pantalla === 'admin') {
    return <PanelAdmin usuario={usuario} onVolver={handleVolverDeAdmin} />;
  }

  return (
    <PanelMensajero
      usuario={usuario}
      onOcrExitoso={handleOcr}
      onLogout={handleLogout}
      onVerAdmin={handleVerAdmin}
    />
  );
}
