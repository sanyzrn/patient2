import React, { useRef, useEffect } from 'react';
import { X } from 'lucide-react';
import { Catalog } from '../types';
import QRCode from 'qrcode';

interface QrModalProps {
  catalog: Catalog;
  onClose: () => void;
}

const QrModal: React.FC<QrModalProps> = ({ catalog, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const url = `${window.location.origin}${window.location.pathname}?cat=${catalog.id}`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, url, {
        width: 200,
        margin: 2,
        color: { dark: '#b61615', light: '#ffffff' }
      });
    }
  }, [url]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.download = `${catalog.title}-qr.png`;
    link.href = canvasRef.current!.toDataURL();
    link.click();
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-skin-card rounded-2xl p-6 text-center shadow-2xl max-w-sm w-full mx-4"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <p className="font-black text-skin-text text-sm">{catalog.title}</p>
          <button
            onClick={onClose}
            className="p-1 text-skin-muted hover:text-skin-text transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-skin-muted mb-4">برای اشتراک‌گذاری با بیمار اسکن کنید</p>
        <canvas
          ref={canvasRef}
          className="rounded-xl mx-auto bg-white p-4"
          style={{ border: '2px solid var(--color-border)' }}
        />
        <div className="flex gap-2 mt-4">
          <button
            onClick={handleDownload}
            className="flex-1 bg-skin-primary hover:bg-skin-primary-hover text-white py-2 rounded-xl text-sm font-bold transition-colors"
          >
            دانلود
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-skin-control-bg hover:bg-skin-control-hover text-skin-text py-2 rounded-xl text-sm font-bold transition-colors"
          >
            بستن
          </button>
        </div>
      </div>
    </div>
  );
};

export default QrModal;
