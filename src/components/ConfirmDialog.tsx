import { useEffect, useId, useRef } from 'react';
import { CloseIcon } from './icons';

/** In-app replacement for `window.confirm`/`alert`. Omit `onConfirm` for an alert with one button. */
export function ConfirmDialog({
  title,
  children,
  confirmLabel = 'OK',
  cancelLabel = 'Cancel',
  danger = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm?: () => void | Promise<void>;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open) d.showModal();
  }, []);

  return (
    <dialog
      ref={ref}
      className="sheet confirm"
      role={onConfirm ? 'alertdialog' : 'dialog'}
      aria-labelledby={titleId}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) ref.current?.close();
      }}
    >
      <div className="sheet-body">
        <div className="sheet-head">
          <h2 id={titleId} className="sheet-title">
            {title}
          </h2>
          <button type="button" className="icon-btn ghost" aria-label="Close" onClick={() => ref.current?.close()}>
            <CloseIcon />
          </button>
        </div>
        <div className="confirm-body">{children}</div>
        <div className="sheet-actions">
          {onConfirm ? (
            <>
              <button type="button" className="btn" onClick={() => ref.current?.close()} autoFocus>
                {cancelLabel}
              </button>
              <button
                type="button"
                className={`btn ${danger ? 'danger-solid' : 'primary'}`}
                onClick={async () => {
                  await onConfirm();
                  ref.current?.close();
                }}
              >
                {confirmLabel}
              </button>
            </>
          ) : (
            <button type="button" className="btn primary" onClick={() => ref.current?.close()} autoFocus>
              {confirmLabel}
            </button>
          )}
        </div>
      </div>
    </dialog>
  );
}
