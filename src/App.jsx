import { useState, memo } from 'react';
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch';
import Modal from './components/Modal';
import manualData from './data/manual.json';
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
  const [activeSystem, setActiveSystem] = useState(null);

  // Event delegation: listens to clicks on any element with class="clickable" inside the SVG
  const handleSvgClick = (e) => {
    const clickedTarget = e.target.closest('.clickable');

    if (clickedTarget) {
      const elementId = clickedTarget.id;
      const systemData = manualData[elementId];

      if (systemData) {
        setActiveSystem(systemData);
      } else {
        console.warn(`No manual data found for ID: ${elementId}`);
      }
    }
  };

  const closeModal = () => {
    setActiveSystem(null);
  };

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

      {/* System Details Modal */}
      {activeSystem && <Modal data={activeSystem} onClose={closeModal} />}
    </div>
  );
}
