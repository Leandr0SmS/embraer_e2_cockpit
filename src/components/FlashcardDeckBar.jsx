/**
 * Top control bar for Flashcards Study Mode:
 * - Switching between Limitations (62) and Memory Items (15) decks
 * - Visual progress bar and live Mastered / Review counters
 * - Shuffle toggle, Restart, and Exit buttons
 */
export default function FlashcardDeckBar({
  activeDeckId = 'limitations',
  onSelectDeck,
  stats,
  isShuffled = false,
  onToggleShuffle,
  onRestart,
  onExit,
  currentIndex = 0,
}) {
  return (
    <header className="flashcard-deck-bar" aria-label="Flashcards Navigation and Controls">
      <div className="flashcard-bar-top">
        {/* Deck Switcher Pills */}
        <div className="flashcard-deck-pills" role="tablist" aria-label="Flashcard Decks">
          <button
            type="button"
            role="tab"
            aria-selected={activeDeckId === 'limitations'}
            className={`flashcard-deck-pill ${activeDeckId === 'limitations' ? 'active' : ''}`}
            onClick={() => onSelectDeck('limitations')}
          >
            Limitations <span className="deck-count-badge">62</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeDeckId === 'memory'}
            className={`flashcard-deck-pill ${activeDeckId === 'memory' ? 'active' : ''}`}
            onClick={() => onSelectDeck('memory')}
          >
            Memory Items <span className="deck-count-badge">15</span>
          </button>
        </div>

        {/* Deck Utilities (Shuffle, Restart, Exit) */}
        <div className="flashcard-bar-actions">
          <button
            type="button"
            className={`flashcard-action-btn ${isShuffled ? 'active' : ''}`}
            onClick={onToggleShuffle}
            title={isShuffled ? 'Shuffle is ON — Cards are randomized' : 'Shuffle is OFF — Sequential order'}
            aria-label="Toggle card shuffle"
          >
            🔀 Shuffle
          </button>

          <button
            type="button"
            className="flashcard-action-btn"
            onClick={onRestart}
            title="Restart current deck from card 1"
            aria-label="Restart current deck"
          >
            ↺ Restart
          </button>

          {onExit && (
            <button
              type="button"
              className="flashcard-action-btn exit-btn"
              onClick={onExit}
              title="Return to Cockpit & Flows"
              aria-label="Exit Flashcards Study Mode"
            >
              ✕ Exit
            </button>
          )}
        </div>
      </div>

      {/* Progress & Live Stats Bar */}
      <div className="flashcard-progress-section">
        <div className="flashcard-progress-labels">
          <span className="flashcard-step-label">
            Card {Math.min(currentIndex + 1, stats.total)} of {stats.total}
          </span>

          <div className="flashcard-chips-group">
            <span className="flashcard-chip chip-know" title="Cards marked as known">
              ✓ {stats.mastered} Mastered
            </span>
            <span className="flashcard-chip chip-review" title="Cards marked for review">
              ↺ {stats.needsReview} Review
            </span>
            {stats.passed > 0 && (
              <span className="flashcard-chip chip-pass" title="Cards passed">
                ↷ {stats.passed} Passed
              </span>
            )}
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div
          className="flashcard-progress-track"
          role="progressbar"
          aria-valuenow={stats.progressPercent}
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <div
            className="flashcard-progress-fill"
            style={{ width: `${stats.progressPercent}%` }}
          />
        </div>
      </div>
    </header>
  );
}

