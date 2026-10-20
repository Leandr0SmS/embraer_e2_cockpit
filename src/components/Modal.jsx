import { useState, useEffect } from 'react';

export default function Modal({ data, onClose, onSave }) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState('');
  const [system, setSystem] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    if (data) {
      setTitle(data.title || '');
      setSystem(data.system || '');
      setDescription(data.description || '');
      setIsEditing(false);
      setSaveMessage('');
    }
  }, [data]);

  if (!data) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveMessage('');

    try {
      await onSave(data.id, {
        title: title.trim(),
        system: system.trim(),
        description: description.trim(),
      });
      setIsEditing(false);
      setSaveMessage('Saved to manual.json!');
      setTimeout(() => setSaveMessage(''), 2500);
    } catch (err) {
      setSaveMessage(`Error: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      {/* Stop propagation so clicking inside the modal content doesn't close it */}
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-meta">
          {data.system && <span className="modal-badge">{data.system}</span>}
          {data.id && <code className="modal-id">ID: {data.id}</code>}
        </div>

        {!isEditing ? (
          <>
            <h2>{data.title}</h2>
            <p className="modal-description">{data.description}</p>
            {saveMessage && <div className="save-status">{saveMessage}</div>}
            <div className="modal-actions">
              <button
                type="button"
                className="edit-btn"
                onClick={() => setIsEditing(true)}
              >
                Edit Info
              </button>
              <button type="button" className="close-btn" onClick={onClose}>
                Close
              </button>
            </div>
          </>
        ) : (
          <form className="modal-edit-form" onSubmit={handleSave}>
            <label className="form-label">
              System / Panel Category
              <input
                type="text"
                className="form-input"
                value={system}
                onChange={(e) => setSystem(e.target.value)}
                placeholder="e.g. Flight Controls"
                required
              />
            </label>

            <label className="form-label">
              Control Title
              <input
                type="text"
                className="form-input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. EICAS FULL Pushbutton"
                required
              />
            </label>

            <label className="form-label">
              Description & Study Notes
              <textarea
                className="form-textarea"
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter detailed description, normal/abnormal operation, limitations..."
                required
              />
            </label>

            {saveMessage && <div className="save-status error">{saveMessage}</div>}

            <div className="modal-actions">
              <button type="submit" className="save-btn" disabled={saving}>
                {saving ? 'Saving...' : 'Save to manual.json'}
              </button>
              <button
                type="button"
                className="cancel-btn"
                onClick={() => {
                  setTitle(data.title || '');
                  setSystem(data.system || '');
                  setDescription(data.description || '');
                  setIsEditing(false);
                }}
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
