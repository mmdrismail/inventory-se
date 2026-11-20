import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { useAppData } from '../../context/AppDataContext';

export const Modal = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-lg',
  showClose = true,
  zIndex = 'z-50',
}) => {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 ${zIndex} flex items-center justify-center p-4 sm:p-6 overflow-y-auto`}>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div
        className={`relative w-full ${maxWidth} bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-10 overflow-hidden transform transition-all duration-200 scale-100 my-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
          <div>
            {title && <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>}
            {description && <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{description}</p>}
          </div>
          {showClose && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 max-h-[calc(85vh-140px)] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

export const GlobalConfirmModal = () => {
  const { confirmModal, closeConfirmModal } = useAppData();

  if (!confirmModal.isOpen) return null;

  return (
    <Modal
      isOpen={confirmModal.isOpen}
      onClose={closeConfirmModal}
      title={confirmModal.title}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {confirmModal.message}
        </p>

        <div className="flex items-center justify-end gap-3 pt-3">
          <Button variant="secondary" onClick={closeConfirmModal}>
            {confirmModal.cancelText || 'Cancel'}
          </Button>
          <Button
            variant={confirmModal.isDestructive ? 'danger' : 'primary'}
            onClick={confirmModal.onConfirm}
          >
            {confirmModal.confirmText || 'Confirm'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
