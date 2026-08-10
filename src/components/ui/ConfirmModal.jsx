import Modal from './Modal';
import Button from './Button';

// window.confirm 대체용 — 앱 디자인에 맞춘 확인 팝업
export default function ConfirmModal({
  title = '확인',
  message,
  confirmLabel = '확인',
  cancelLabel = '취소',
  danger = false,
  onConfirm,
  onCancel,
}) {
  return (
    <Modal
      title={title}
      onClose={onCancel}
      actions={
        <>
          <Button variant="secondary" onClick={onCancel}>{cancelLabel}</Button>
          <Button variant={danger ? 'danger' : 'primary'} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <p className="text-body-sm" style={{ padding: 'var(--space-md) 0', whiteSpace: 'pre-line' }}>
        {message}
      </p>
    </Modal>
  );
}
