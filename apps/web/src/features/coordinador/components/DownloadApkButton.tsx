import { useState } from 'react';
import { Download, QrCode, Link, X, Check } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { DownloadIcon } from './CoordIcons.tsx';

const PLAY_STORE_URL = 'https://play.google.com/store/apps/details?id=com.mtbit.cambioapp';

export default function DownloadApkButton() {
  const [showModal, setShowModal] = useState(false);
  const [toast, setToast] = useState(false);

  function copyLink() {
    navigator.clipboard.writeText(PLAY_STORE_URL);
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <>
      <div className="coord-download-banner">
        <span className="coord-download-banner__icon">
          <DownloadIcon />
        </span>
        <div className="coord-download-banner__copy">
          <h2>Descargar app para cadete</h2>
          <p>Instalá la app de Plaza App en el dispositivo del cadete.</p>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="coord-download-banner__button"
        >
          <Download size={18} />
          Descargar app
        </button>
      </div>

      {/* Modal centrado con QR + link de descarga */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="card w-full max-w-xs text-center" style={{ color: '#111827' }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Descargar app</h2>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className="flex justify-center mb-3">
              <QRCodeSVG value={PLAY_STORE_URL} size={200} />
            </div>
            <p className="text-xs text-gray-400 mb-5 flex items-center justify-center gap-1.5">
              <QrCode size={13} className="text-gray-400" />
              Apuntá la cámara del celular al código para descargar la app
            </p>
            <button
              onClick={copyLink}
              className="btn-secondary w-full border-gray-300 text-gray-600 flex items-center justify-center gap-2 mb-2"
            >
              <Link size={16} className="text-coordinador" />
              Copiar link de descarga
            </button>
            <button
              onClick={() => setShowModal(false)}
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
