import { Modal } from './Modal';
import { Button } from './Button';
import { AlertTriangle } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
}

export function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel' }: ConfirmDialogProps) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <div className="flex flex-col gap-5">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-red-500 dark:text-red-400" />
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-300 pt-2 leading-relaxed">{message}</p>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>{cancelLabel}</Button>
          <Button variant="danger" onClick={() => { onConfirm(); onClose(); }}>{confirmLabel}</Button>
        </div>
      </div>
    </Modal>
  );
}
