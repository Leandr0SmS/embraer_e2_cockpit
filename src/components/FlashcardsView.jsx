import { useState, useMemo, useEffect, useCallback } from 'react';
import FlashcardCard from './FlashcardCard';
import FlashcardDeckBar from './FlashcardDeckBar';
import limitationsData from '../data/flashcards-limitations.json';
import memoryData from '../data/flashcards-memory.json';
import { shuffleDeck, calculateDeckStats } from '../utils/flashcardEngine';

const DECKS = {
  limitations: {
    id: 'limitations',
    name: 'Aircraft Limitations',
    cards: limitationsData,
  },
  memory: {
    id: 'memory',
    name: 'Memory Items',
    cards: memoryData,
  },
};

/**
 * Main container for Flashcards Study Mode:
 * - Manages active deck selection, shuffling, and progression
 * - Coordinates 3D card flips, ratings ('know', 'review', 'pass')
 * - Keyboard navigation (Space, ArrowLeft, ArrowRight, P)
 * - Dock controls for desktop and mobile accessibility
 */
export default function FlashcardsView({ onExit }) {
  const [activeDeckId, setActiveDeckId] = useState('limitations');
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({});

  // Active base deck cards
  const rawCards = useMemo(() => DECKS[activeDeckId]?.cards ?? [], [activeDeckId]);

  // Shuffled or sequential active deck
  const activeDeck = useMemo(() => {
    return isShuffled ? shuffleDeck(rawCards) : rawCards;
  }, [rawCards, isShuffled]);

  const totalCards = activeDeck.length;
  const currentCard = activeDeck[currentIndex] ?? null;
  const isComplete = currentIndex >= totalCards;

  const stats = useMemo(() => {
    return calculateDeckStats(totalCards, results);
  }, [totalCards, results]);

  // Switch between Limitations and Memory Items decks
  const handleSelectDeck = useCallback((deckId) => {
    setActiveDeckId(deckId);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
  }, []);

  // Toggle shuffle and restart deck
  const handleToggleShuffle = useCallback(() => {
    setIsShuffled((prev) => !prev);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
  }, []);

  // Restart current deck
  const handleRestart = useCallback(() => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
  }, []);

  // Flip card
  const handleFlip = useCallback(() => {
    if (!isComplete) {
      setIsFlipped((prev) => !prev);
    }
  }, [isComplete]);

  // Rate card as 'know' (Mastered) or 'review' (Needs Practice)
  const handleRate = useCallback(
    (rating) => {
      if (isComplete) return;

      setResults((prev) => ({
        ...prev,
        [currentIndex]: rating,
      }));
      setIsFlipped(false);
      setCurrentIndex((prev) => prev + 1);
    },
    [isComplete, currentIndex]
  );

  // Pass / Skip card without recording a score
  const handlePass = useCallback(() => {
    if (isComplete) return;

    setResults((prev) => ({
      ...prev,
      [currentIndex]: 'pass',
    }));
    setIsFlipped(false);
    setCurrentIndex((prev) => prev + 1);
  }, [isComplete, currentIndex]);

  // Go back to previous card
  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setIsFlipped(false);
    }
  }, [currentIndex]);

  // Global keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Don't intercept when typing in inputs/textareas
      const tag = e.target?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        handleFlip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleRate('know');
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handleRate('review');
      } else if (e.key === 'ArrowDown' || e.key.toLowerCase() === 'p') {
        e.preventDefault();
        handlePass();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrev();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleFlip, handleRate, handlePass, handlePrev]);

  return (
    <div className="flashcards-container" aria-label="Flashcards Study Experience">
      {/* Top Deck Navigation Bar */}
      <FlashcardDeckBar
        activeDeckId={activeDeckId}
        onSelectDeck={handleSelectDeck}
        stats={stats}
        isShuffled={isShuffled}
        onToggleShuffle={handleToggleShuffle}
        onRestart={handleRestart}
        onExit={onExit}
        currentIndex={currentIndex}
      />

      {/* Main Study Arena */}
      <main className="flashcards-stage-wrapper">
        {!isComplete && currentCard ? (
          <FlashcardCard
            card={currentCard}
            deckName={DECKS[activeDeckId]?.name}
            cardIndex={currentIndex}
            totalCards={totalCards}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onSwipe={handleRate}
          />
        ) : (
          <div className="deck-complete-card">
            <div className="deck-complete-icon">🎉</div>
            <h2 className="deck-complete-title">Deck Completed!</h2>
            <p className="deck-complete-subtitle">
              You reviewed all {totalCards} cards in this deck.
            </p>
            <div className="deck-complete-stats">
              <div className="stat-box">
                <span className="stat-val mastered">{stats.mastered}</span>
                <span className="stat-lbl">Mastered</span>
              </div>
              <div className="stat-box">
                <span className="stat-val review">{stats.needsReview}</span>
                <span className="stat-lbl">Needs Review</span>
              </div>
              <div className="stat-box">
                <span className="stat-val accuracy">{stats.accuracy}%</span>
                <span className="stat-lbl">Accuracy</span>
              </div>
            </div>
            <button
              type="button"
              className="deck-complete-restart-btn"
              onClick={handleRestart}
            >
              Study Again (↺)
            </button>
          </div>
        )}
      </main>

      {/* Bottom Floating Control Dock */}
      {!isComplete && (
        <footer className="flashcards-bottom-dock" aria-label="Flashcard Controls">
          <button
            type="button"
            className="fc-ctrl-btn review-btn"
            onClick={() => handleRate('review')}
            title="Mark for review (ArrowLeft / Drag Left)"
          >
            <span className="btn-icon">↺</span> Review
            <span className="kbd-shortcut">←</span>
          </button>

          <button
            type="button"
            className="fc-ctrl-btn flip-btn"
            onClick={handleFlip}
            title="Flip card between question and answer (Space / Enter)"
          >
            <span className="btn-icon">⇄</span> {isFlipped ? 'Show Question' : 'Reveal Answer'}
            <span className="kbd-shortcut">Space</span>
          </button>

          <button
            type="button"
            className="fc-ctrl-btn know-btn"
            onClick={() => handleRate('know')}
            title="Mark as known / mastered (ArrowRight / Drag Right)"
          >
            <span className="btn-icon">✓</span> I Know This
            <span className="kbd-shortcut">→</span>
          </button>

          <button
            type="button"
            className="fc-ctrl-btn pass-btn"
            onClick={handlePass}
            title="Pass to next card without rating (P / ArrowDown)"
          >
            Pass <span className="kbd-shortcut">P</span>
          </button>
        </footer>
      )}
    </div>
  );
}
