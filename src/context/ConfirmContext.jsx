import { createContext, useCallback, useContext, useState } from 'react';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [dialog, setDialog] = useState(null);

  const confirm = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({ mode: 'confirm', message, resolve, ...options });
    });
  }, []);

  const alertDialog = useCallback((message, options = {}) => {
    return new Promise((resolve) => {
      setDialog({ mode: 'alert', message, resolve, ...options });
    });
  }, []);

  const close = (result) => {
    dialog?.resolve(result);
    setDialog(null);
  };

  return (
    <ConfirmContext.Provider value={{ confirm, alertDialog }}>
      {children}
      {dialog && (
        <Modal
          title={dialog.title ?? (dialog.mode === 'alert' ? '알림' : '확인')}
          onClose={() => close(false)}
          actions={
            dialog.mode === 'alert' ? (
              <Button
                variant="primary"
                style={dialog.danger ? { backgroundColor: '#d32f2f', borderColor: '#d32f2f' } : undefined}
                onClick={() => close(true)}
              >
                확인
              </Button>
            ) : (
              <>
                <Button variant="secondary" onClick={() => close(false)}>
                  {dialog.cancelText ?? '취소'}
                </Button>
                <Button
                  variant="primary"
                  style={dialog.danger ? { backgroundColor: '#d32f2f', borderColor: '#d32f2f' } : undefined}
                  onClick={() => close(true)}
                >
                  {dialog.confirmText ?? '확인'}
                </Button>
              </>
            )
          }
        >
          <p className="text-body-md" style={{ whiteSpace: 'pre-line' }}>{dialog.message}</p>
        </Modal>
      )}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error('useConfirm must be used within ConfirmProvider');
  return ctx;
}
