// Fix 1.4: Custom ConfirmDialog replacing window.confirm
import React, { useEffect, useRef } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmLabel = 'تأیید',
  cancelLabel = 'انصراف',
  onConfirm,
  onCancel,
  danger = false,
}) => {
  const cancelRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      cancelRef.current?.focus();
      const onKey = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onCancel();
      };
      document.addEventListener('keydown', onKey);
      return () => document.removeEventListener('keydown', onKey);
    }
  }, [isOpen, onCancel]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
    >
      <div className="bg-skin-card border border-skin-border rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6 animate-fade-in">
        <div className="flex items-start gap-3 mb-4">
          <div className={`p-2 rounded-full shrink-0 ${danger ? 'bg-red-100 text-red-600' : 'bg-amber-100 text-amber-600'}`}>
            <AlertTriangle size={20} />
          </div>
          <div className="flex-1">
            <h2 id="confirm-title" className="font-bold text-skin-text text-base">{title}</h2>
            <p id="confirm-desc" className="text-skin-muted text-sm mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={onCancel}
            className="text-skin-muted hover:text-skin-text transition-colors p-1 rounded-lg hover:bg-skin-control-bg"
            aria-label="بستن"
          >
            <X size={16} />
          </button>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button
            ref={cancelRef}
            onClick={onCancel}
            className="px-4 py-2 rounded-lg bg-skin-control-bg hover:bg-skin-control-hover text-skin-control-text text-sm font-medium transition-colors"
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-lg text-white text-sm font-bold transition-colors ${
              danger
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-skin-primary hover:bg-skin-primary-hover'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
