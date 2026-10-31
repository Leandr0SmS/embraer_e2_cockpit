import { useState, useMemo, useEffect, useCallback } from 'react';
import FlashcardCard from './FlashcardCard';
import FlashcardDeckBar from './FlashcardDeckBar';
import FlashcardSummary from './FlashcardSummary';
import limitationsData from '../data/flashcards-limitations.json';
import memoryData from '../data/flashcards-memory.json';
import { shuffleDeck, calculateDeckStats, filterMissedCards } from '../utils/flashcardEngine';

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
 * - Supports targeted "Review Missed Cards" mode
 * - Deck summary upon completion with accuracy breakdown
 * - Keyboard navigation (Space, ArrowLeft, ArrowRight, P)
 * - Dock controls for desktop and mobile accessibility
 */
export default function FlashcardsView({ onExit }) {
  const [activeDeckId, setActiveDeckId] = useState('limitations');
  const [isShuffled, setIsShuffled] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [results, setResults] = useState({});

  // When true, user is studying a filtered queue of missed cards from previous run
  const [customDeck, setCustomDeck] = useState(null);

  // Active base deck cards (custom deck takes precedence if active)
  const rawCards = useMemo(() => {
    if (customDeck && customDeck.length > 0) {
      return customDeck;
    }
    return DECKS[activeDeckId]?.cards ?? [];
  }, [activeDeckId, customDeck]);

  // Shuffled or sequential active deck
  const activeDeck = useMemo(() => {
    return isShuffled ? shuffleDeck(rawCards) : rawCards;
  }, [rawCards, isShuffled]);

  const totalCards = activeDeck.length;
  const currentCard = activeDeck[currentIndex] ?? null;
  const isComplete = totalCards > 0 && currentIndex >= totalCards;
  const isReviewMode = customDeck !== null;

  const stats = useMemo(() => {
    return calculateDeckStats(totalCards, results);
  }, [totalCards, results]);

  // Switch between Limitations and Memory Items decks
  const handleSelectDeck = useCallback((deckId) => {
    setActiveDeckId(deckId);
    setCustomDeck(null);
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

  // Restart current full deck
  const handleRestart = useCallback(() => {
    setCustomDeck(null);
    setCurrentIndex(0);
    setIsFlipped(false);
    setResults({});
  }, []);

  // Start a focused review session with only the cards marked as 'review'
  const handleReviewMissed = useCallback(() => {
    const missed = filterMissedCards(activeDeck, results);
    if (missed.length > 0) {
      setCustomDeck(missed);
      setCurrentIndex(0);
      setIsFlipped(false);
      setResults({});
    }
  }, [activeDeck, results]);

  // Quick switch to the opposite deck
  const handleSwitchDeck = useCallback(() => {
    const nextDeckId = activeDeckId === 'limitations' ? 'memory' : 'limitations';
    handleSelectDeck(nextDeckId);
  }, [activeDeckId, handleSelectDeck]);

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

  const deckTitle = isReviewMode
    ? `${DECKS[activeDeckId]?.name} (Missed Cards)`
    : DECKS[activeDeckId]?.name;

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
            deckName={deckTitle}
            cardIndex={currentIndex}
            totalCards={totalCards}
            isFlipped={isFlipped}
            onFlip={handleFlip}
            onSwipe={handleRate}
          />
        ) : (
          <FlashcardSummary
            deckName={DECKS[activeDeckId]?.name}
            stats={stats}
            isReviewMode={isReviewMode}
            onReviewMissed={handleReviewMissed}
            onRestartFull={handleRestart}
            onSwitchDeck={handleSwitchDeck}
            onExit={onExit}
          />
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
            <span className="btn-icon">↺</span>
            <span className="fc-btn-label">Review</span>
            <span className="kbd-shortcut">←</span>
          </button>

          <button
            type="button"
            className="fc-ctrl-btn flip-btn"
            onClick={handleFlip}
            title="Flip card between question and answer (Space / Enter)"
          >
            <span className="btn-icon">⇄</span>
            <span className="fc-btn-label-full">
              {isFlipped ? 'Show Question' : 'Reveal Answer'}
            </span>
            <span className="fc-btn-label-short">
              {isFlipped ? 'Question' : 'Flip'}
            </span>
            <span className="kbd-shortcut">Space</span>
          </button>

          <button
            type="button"
            className="fc-ctrl-btn know-btn"
            onClick={() => handleRate('know')}
            title="Mark as known / mastered (ArrowRight / Drag Right)"
          >
            <span className="btn-icon">✓</span>
            <span className="fc-btn-label-full">I Know This</span>
            <span className="fc-btn-label-short">Know</span>
            <span className="kbd-shortcut">→</span>
          </button>

          <button
            type="button"
            className="fc-ctrl-btn pass-btn"
            onClick={handlePass}
            title="Pass to next card without rating (P / ArrowDown)"
          >
            <span className="fc-btn-label">Pass</span>
            <span className="kbd-shortcut">P</span>
          </button>
        </footer>
      )}
    </div>
  );
}
