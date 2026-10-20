export default function Modal({ data, onClose }) {
  if (!data) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Stop propagation so clicking inside the modal content doesn't close it */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        {data.system && <span className="modal-badge">{data.system}</span>}
        <h2>{data.title}</h2>
        <p>{data.description}</p>
        <button className="close-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
