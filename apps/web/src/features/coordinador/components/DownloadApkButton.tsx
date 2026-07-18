import { useState, useRef, useEffect } from 'react';
import { Download, QrCode, Link, X, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';

const APK_URL =
  'https://github.com/MatiasMT93/cambioapp-releases/releases/latest/download/CambioApp.apk';

export default function DownloadApkButton() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [toast, setToast] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpen]);

  function copyLink() {
    navigator.clipboard.writeText(APK_URL);
    setMenuOpen(false);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <>
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          className="coord-download-card"
        >
          <Download size={18} />
          Descargar APK para cadete
        </button>

        {menuOpen && (
          <div className="absolute top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-30 overflow-hidden">
            <button
              onClick={() => { setShowQr(true); setMenuOpen(false); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <QrCode size={18} className="text-coordinador" />
              Mostrar QR
            </button>
            <div className="border-t border-gray-100" />
            <button
              onClick={copyLink}
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Link size={18} className="text-coordinador" />
              Compartir link de descarga
            </button>
          </div>
        )}
      </div>

      {/* Modal QR */}
      {showQr && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="card w-full max-w-xs text-center">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Escanear para descargar</h2>
              <button onClick={() => setShowQr(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex justify-center mb-3">
              <QRCodeSVG value={APK_URL} size={200} />
            </div>
            <p className="text-xs text-gray-400 mb-5">
              Apuntá la cámara del celular al código para descargar la app
            </p>
            <button
              onClick={() => setShowQr(false)}
              className="btn-secondary w-full border-gray-300 text-gray-600"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      {/* Toast "Link copiado" */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 transition-all duration-300 ${
          toast ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'
        }`}
      >
        <div className="bg-gray-900 text-white text-sm px-4 py-2.5 rounded-full shadow-lg whitespace-nowrap flex items-center gap-2">
          <Check size={14} className="text-green-400" />
          Link de descarga copiado
        </div>
      </div>
    </>
  );
}
