/**
 * Pure business logic and utilities for the Flashcards Study Mode:
 * - Fisher-Yates deck shuffle
 * - Swipe gesture physics & threshold calculations
 * - Session stats & accuracy scoring
 * - Deck validation & missed card filtering
 */

export const SWIPE_THRESHOLD_PX = 110;
export const ROTATION_FACTOR = 0.08;
export const MAX_ROTATION_DEG = 14;

/**
 * Returns a new shuffled copy of a deck array using the Fisher-Yates algorithm.
 * Accepts an optional randomFn (defaults to Math.random) for deterministic testing.
 */
export function shuffleDeck(deck = [], randomFn = Math.random) {
  if (!Array.isArray(deck)) return [];
  const result = [...deck];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Calculates gesture displacement physics, swipe direction, and rotation angle.
 */
export function calculateSwipeProgress(dx = 0, threshold = SWIPE_THRESHOLD_PX) {
  const absDx = Math.abs(dx);
  const direction = dx > 0 ? 'right' : dx < 0 ? 'left' : 'none';
  const ratio = threshold > 0 ? Math.min(1, absDx / threshold) : 0;
  const isPastThreshold = absDx >= threshold;
  const rawRotation = dx * ROTATION_FACTOR;
  const rotation = Math.max(-MAX_ROTATION_DEG, Math.min(MAX_ROTATION_DEG, rawRotation));

  return {
    dx,
    direction,
    ratio,
    isPastThreshold,
    rotation,
  };
}

/**
 * Computes deck performance stats from an array of answers or answer map:
 * results can be an array or object mapping card indices/ids to 'know' | 'review' | 'pass'.
 */
export function calculateDeckStats(totalCards = 0, results = {}) {
  const values = Array.isArray(results) ? results : Object.values(results);
  const mastered = values.filter((status) => status === 'know').length;
  const needsReview = values.filter((status) => status === 'review').length;
  const passed = values.filter((status) => status === 'pass').length;
  const answered = mastered + needsReview + passed;
  const scoredCount = mastered + needsReview;
  const accuracy = scoredCount > 0 ? Math.round((mastered / scoredCount) * 100) : 0;
  const progressPercent = totalCards > 0 ? Math.round((answered / totalCards) * 100) : 0;

  return {
    total: totalCards,
    answered,
    mastered,
    needsReview,
    passed,
    accuracy,
    progressPercent,
    isComplete: totalCards > 0 && answered >= totalCards,
  };
}

/**
 * Filters cards from the original deck that were marked as 'review' (needs re-study).
 */
export function filterMissedCards(deck = [], results = {}) {
  if (!Array.isArray(deck)) return [];
  return deck.filter((card, index) => {
    const status = Array.isArray(results) ? results[index] : results[index] ?? results[card.question];
    return status === 'review';
  });
}

/**
 * Validates a flashcard deck array ensuring each card has a valid non-empty question and answer.
 */
export function validateDeck(deck) {
  if (!Array.isArray(deck)) {
    return { isValid: false, count: 0, errors: ['Deck must be an array'] };
  }

  const errors = [];
  deck.forEach((card, i) => {
    if (!card || typeof card !== 'object') {
      errors.push(`Card #${i} is not an object`);
      return;
    }
    if (typeof card.question !== 'string' || card.question.trim() === '') {
      errors.push(`Card #${i} is missing a non-empty "question"`);
    }
    if (typeof card.answer !== 'string' || card.answer.trim() === '') {
      errors.push(`Card #${i} is missing a non-empty "answer"`);
    }
  });

  return {
    isValid: errors.length === 0,
    count: deck.length,
    errors,
  };
}

