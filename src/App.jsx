import { useState, memo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Modal from './components/Modal';
import initialManualData from './data/manual.json';
import painelSvgRaw from '../painel_svg.svg?raw';
import './App.css';

// Memoized so opening/closing the modal does not re-parse the inline SVG
const InlineCockpitSvg = memo(function InlineCockpitSvg({ onSvgClick }) {
  return (
    <div
      className="svg-wrapper"
      onClick={onSvgClick}
      dangerouslySetInnerHTML={{ __html: painelSvgRaw }}
    />
  );
});

export default function App() {
  const [manualEntries, setManualEntries] = useState(initialManualData);
  const [activeId, setActiveId] = useState(null);

  // Event delegation: listens to clicks on any element with class="clickable" inside the SVG
  const handleSvgClick = (e) => {
    const clickedTarget = e.target.closest('.clickable');

    if (clickedTarget) {
      const elementId = clickedTarget.id;
      const systemData = manualEntries[elementId];

      if (systemData) {
        setActiveId(elementId);
      } else {
        console.warn(`No manual data found for ID: ${elementId}`);
      }
    }
  };

  const closeModal = () => {
    setActiveId(null);
  };

  const handleSaveEntry = async (id, updatedFields) => {
    // Update local React state immediately
    setManualEntries((prev) => ({
      ...prev,
      [id]: updatedFields,
    }));

    // Also update the SVG <title> tooltip inside the DOM if present
    const svgGroup = document.getElementById(id);
    if (svgGroup) {
      const titleEl = svgGroup.querySelector('title');
      if (titleEl && updatedFields.title) {
        titleEl.textContent = updatedFields.title;
      }
    }

    // Persist directly to src/data/manual.json via Vite dev server middleware
    const response = await fetch('/api/save-manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...updatedFields }),
    });

    if (!response.ok) {
      throw new Error('Failed to save to src/data/manual.json');
    }
  };

  const activeSystem = activeId
    ? { id: activeId, ...manualEntries[activeId] }
    : null;

  return (
    <div className="app-container">
      <TransformWrapper
        initialScale={1}
        minScale={0.5}
        maxScale={12}
        centerOnInit={true}
        wheel={{ step: 0.15 }}
      >
        <TransformComponent
          wrapperStyle={{ width: '100vw', height: '100vh' }}
          contentStyle={{ width: '100vw', height: '100vh' }}
        >
          <InlineCockpitSvg onSvgClick={handleSvgClick} />
        </TransformComponent>
      </TransformWrapper>

      {/* System Details & In-App Editor Modal */}
      {activeSystem && (
        <Modal
          data={activeSystem}
          onClose={closeModal}
          onSave={handleSaveEntry}
        />
      )}
    </div>
  );
}
