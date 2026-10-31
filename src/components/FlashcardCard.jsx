import { useState, useRef, useCallback } from 'react';
import { calculateSwipeProgress, SWIPE_THRESHOLD_PX } from '../utils/flashcardEngine';

/**
 * 3D flippable flashcard component with mouse & touch drag-to-review gesture mechanics.
 * Inspired by NotebookLM:
 * - Click / tap flips card between Question (front) and Answer (back).
 * - Dragging right (>110px) marks as Known/Mastered.
 * - Dragging left (<-110px) marks as Review Needed.
 */
export default function FlashcardCard({
  card,
  deckName = 'Deck',
  cardIndex = 0,
  totalCards = 1,
  isFlipped = false,
  onFlip,
  onSwipe,
  disabled = false,
}) {
  const [dragOffset, setDragOffset] = useState({ dx: 0, dy: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState(null); // 'know' | 'review' | null

  const pointerStartRef = useRef(null);
  const cardRef = useRef(null);

  const swipeProgress = calculateSwipeProgress(dragOffset.dx, SWIPE_THRESHOLD_PX);

  // Handle pointer down (mouse click or touch start)
  const handlePointerDown = (e) => {
    if (disabled || exitDirection) return;
    // Only primary button
    if (e.button !== undefined && e.button !== 0) return;

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      hasMoved: false,
    };

    if (e.target && typeof e.target.setPointerCapture === 'function') {
      try {
        e.target.setPointerCapture(e.pointerId);
      } catch {
        // Safe to ignore in test or synthetic environments
      }
    }
  };

  // Handle pointer move (dragging card left or right)
  const handlePointerMove = (e) => {
    if (!pointerStartRef.current || disabled || exitDirection) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = (e.clientY - pointerStartRef.current.y) * 0.3; // Damp vertical displacement

    if (!pointerStartRef.current.hasMoved && Math.abs(dx) > 6) {
      pointerStartRef.current.hasMoved = true;
      setIsDragging(true);
    }

    if (pointerStartRef.current.hasMoved) {
      setDragOffset({ dx, dy });
    }
  };

  // Handle pointer up (release drag or register tap to flip)
  const handlePointerUp = (e) => {
    if (!pointerStartRef.current) return;

    if (e.target && typeof e.target.releasePointerCapture === 'function') {
      try {
        e.target.releasePointerCapture(e.pointerId);
      } catch {
        // Safe to ignore
      }
    }

    const { hasMoved } = pointerStartRef.current;
    const finalDx = dragOffset.dx;
    pointerStartRef.current = null;
    setIsDragging(false);

    // If card wasn't dragged beyond minimal movement, treat as flip click
    if (!hasMoved || Math.abs(finalDx) < 6) {
      setDragOffset({ dx: 0, dy: 0 });
      if (onFlip) onFlip();
      return;
    }

    // If dragged beyond threshold, trigger swipe exit
    if (Math.abs(finalDx) >= SWIPE_THRESHOLD_PX) {
      const direction = finalDx > 0 ? 'know' : 'review';
      setExitDirection(direction);

      // Allow exit animation to play before transitioning to next card
      setTimeout(() => {
        setExitDirection(null);
        setDragOffset({ dx: 0, dy: 0 });
        if (onSwipe) onSwipe(direction);
      }, 220);
    } else {
      // Spring back to center
      setDragOffset({ dx: 0, dy: 0 });
    }
  };

  const handlePointerCancel = () => {
    pointerStartRef.current = null;
    setIsDragging(false);
    setDragOffset({ dx: 0, dy: 0 });
  };

  // Calculate dynamic transform and badge opacities
  let transform = '';
  if (exitDirection === 'know') {
    transform = 'translateX(120vw) rotate(22deg)';
  } else if (exitDirection === 'review') {
    transform = 'translateX(-120vw) rotate(-22deg)';
  } else if (isDragging) {
    transform = `translate3d(${dragOffset.dx}px, ${dragOffset.dy}px, 0) rotate(${swipeProgress.rotation}deg)`;
  }

  const knowOpacity = swipeProgress.direction === 'right' ? swipeProgress.ratio : 0;
  const reviewOpacity = swipeProgress.direction === 'left' ? swipeProgress.ratio : 0;

  return (
    <div className="flashcard-stage" aria-label="Interactive Flashcard">
      <div
        ref={cardRef}
        className={`flashcard-card ${isFlipped ? 'flipped' : ''} ${
          isDragging ? 'dragging' : ''
        } ${exitDirection ? 'exiting' : ''}`}
        style={{ transform }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
      >
        {/* Swipe Feedback Badges */}
        <div
          className="swipe-badge swipe-badge-know"
          style={{ opacity: knowOpacity }}
          aria-hidden="true"
        >
          ✓ KNOW
        </div>
        <div
          className="swipe-badge swipe-badge-review"
          style={{ opacity: reviewOpacity }}
          aria-hidden="true"
        >
          ↺ REVIEW
        </div>

        {/* 3D Perspective Card Faces */}
        <div className="flashcard-inner">
          {/* Front Face: Question */}
          <div className="flashcard-face flashcard-front">
            <header className="flashcard-face-header">
              <span className="flashcard-deck-tag">{deckName}</span>
              <span className="flashcard-counter">
                {cardIndex + 1} / {totalCards}
              </span>
            </header>

            <main className="flashcard-content">
              <span className="flashcard-prompt-label">QUESTION</span>
              <p className="flashcard-question-text">{card?.question}</p>
            </main>

            <footer className="flashcard-face-footer">
              <span className="flashcard-hint-text">
                <span className="hint-icon">👆</span> Tap or click to reveal answer
              </span>
            </footer>
          </div>

          {/* Back Face: Multi-line Answer */}
          <div className="flashcard-face flashcard-back">
            <header className="flashcard-face-header">
              <span className="flashcard-deck-tag answer-tag">ANSWER</span>
              <span className="flashcard-counter">
                {cardIndex + 1} / {totalCards}
              </span>
            </header>

            <main className="flashcard-content">
              <div className="flashcard-answer-text">{card?.answer}</div>
            </main>

            <footer className="flashcard-face-footer">
              <span className="flashcard-hint-text">
                <span className="hint-icon">👆</span> Tap to flip back • Drag or rate below
              </span>
            </footer>
          </div>
        </div>
      </div>
    </div>
  );
}
