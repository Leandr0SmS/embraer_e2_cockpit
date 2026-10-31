/**
 * End-of-deck performance summary & smart re-study screen:
 * - Displays accuracy percentage & mastery tier breakdown
 * - "Review Missed Cards" action: creates an isolated queue of cards marked for review
 * - "Restart Full Deck" action: restarts from card 1
 * - "Switch Deck" action: easily toggle to the other aircraft study deck
 */
export default function FlashcardSummary({
  deckName = 'Deck',
  stats,
  isReviewMode = false,
  onReviewMissed,
  onRestartFull,
  onSwitchDeck,
  onExit,
}) {
  const { total, mastered, needsReview, passed, accuracy } = stats;
  const hasMissed = needsReview > 0;

  // Visual medal / celebration emoji based on accuracy
  let celebrationEmoji = '🎉';
  let celebrationHeading = 'Great Job!';
  if (accuracy >= 90) {
    celebrationEmoji = '🏆';
    celebrationHeading = 'Outstanding Mastery!';
  } else if (accuracy >= 75) {
    celebrationEmoji = '✈️';
    celebrationHeading = 'Solid Performance!';
  } else if (accuracy > 0) {
    celebrationEmoji = '📚';
    celebrationHeading = 'Good Practice!';
  } else {
    celebrationEmoji = '🔄';
    celebrationHeading = 'Session Complete';
  }

  return (
    <div className="flashcard-summary-card" aria-label="Deck Completion Summary">
      <div className="summary-celebration-icon">{celebrationEmoji}</div>

      <h2 className="summary-title">{celebrationHeading}</h2>
      <p className="summary-subtitle">
        {isReviewMode
          ? `You completed the targeted review session for ${deckName}.`
          : `You reviewed all ${total} cards in ${deckName}.`}
      </p>

      {/* Accuracy Ring / Score Display */}
      <div className="summary-score-badge">
        <span className="summary-score-number">{accuracy}%</span>
        <span className="summary-score-label">Overall Accuracy</span>
      </div>

      {/* Tally Metrics */}
      <div className="summary-metrics-grid">
        <div className="summary-metric-box metric-mastered">
          <span className="metric-val">{mastered}</span>
          <span className="metric-lbl">✓ Mastered</span>
        </div>

        <div className="summary-metric-box metric-review">
          <span className="metric-val">{needsReview}</span>
          <span className="metric-lbl">↺ Needs Review</span>
        </div>

        {passed > 0 && (
          <div className="summary-metric-box metric-passed">
            <span className="metric-val">{passed}</span>
            <span className="metric-lbl">↷ Passed</span>
          </div>
        )}
      </div>

      {/* Re-study Actions */}
      <div className="summary-actions-group">
        {hasMissed && (
          <button
            type="button"
            className="summary-btn btn-review-missed"
            onClick={onReviewMissed}
            title={`Start a focused review of the ${needsReview} card(s) you missed`}
          >
            <span className="btn-icon">↺</span> Review Missed Cards ({needsReview})
          </button>
        )}

        <button
          type="button"
          className="summary-btn btn-restart"
          onClick={onRestartFull}
          title="Restart the entire deck from the beginning"
        >
          <span className="btn-icon">🔄</span> Restart Full Deck ({total})
        </button>

        {onSwitchDeck && (
          <button
            type="button"
            className="summary-btn btn-switch"
            onClick={onSwitchDeck}
            title="Switch to the other flashcard deck"
          >
            Switch Deck ⇄
          </button>
        )}

        {onExit && (
          <button
            type="button"
            className="summary-btn btn-exit-summary"
            onClick={onExit}
            title="Return to the cockpit illustration & flows"
          >
            Return to Cockpit
          </button>
        )}
      </div>
    </div>
  );
}
