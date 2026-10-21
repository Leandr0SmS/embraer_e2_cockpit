import { useEffect } from 'react';

export default function Modal({ data, onClose }) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  if (!data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Stop propagation so clicking inside the modal content doesn't close it */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-header-text">
            {data.system && <span className="modal-badge">{data.system}</span>}
            <h2>{data.title}</h2>
          </div>
          <button
            type="button"
            className="modal-close-icon"
            onClick={onClose}
            aria-label="Close dialog"
          >
            &times;
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-description">{data.description}</p>
        </div>

        <div className="modal-actions">
          <button type="button" className="close-btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
