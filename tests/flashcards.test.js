import { describe, it, expect } from 'vitest';
import memoryCards from '../src/data/flashcards-memory.json';
import limitationCards from '../src/data/flashcards-limitations.json';
import {
  shuffleDeck,
  calculateSwipeProgress,
  calculateDeckStats,
  filterMissedCards,
  validateDeck,
  SWIPE_THRESHOLD_PX,
  MAX_ROTATION_DEG,
} from '../src/utils/flashcardEngine.js';

describe('flashcards data integrity', () => {
  it('flashcards-memory.json contains valid flashcards', () => {
    const val = validateDeck(memoryCards);
    expect(val.isValid).toBe(true);
    expect(val.count).toBe(15);
    expect(val.errors).toEqual([]);
  });

  it('flashcards-limitations.json contains valid flashcards', () => {
    const val = validateDeck(limitationCards);
    expect(val.isValid).toBe(true);
    expect(val.count).toBe(62);
    expect(val.errors).toEqual([]);
  });

  it('validates invalid deck input properly', () => {
    expect(validateDeck(null).isValid).toBe(false);
    expect(validateDeck([{ question: 'Q', answer: '' }]).isValid).toBe(false);
    expect(validateDeck([{ question: '', answer: 'A' }]).isValid).toBe(false);
  });
});

describe('shuffleDeck', () => {
  it('returns a new array with the same length and contents', () => {
    const deck = [{ id: 1 }, { id: 2 }, { id: 3 }, { id: 4 }];
    const shuffled = shuffleDeck(deck);
    expect(shuffled).toHaveLength(deck.length);
    expect(shuffled).not.toBe(deck); // pure, new array
    expect(new Set(shuffled.map((c) => c.id))).toEqual(new Set([1, 2, 3, 4]));
  });

  it('produces deterministic shuffle with a custom randomFn', () => {
    const deck = ['A', 'B', 'C', 'D'];
    const reversed = shuffleDeck(deck, () => 0); // Always picks index 0
    expect(reversed).not.toEqual(deck);
  });
});

describe('calculateSwipeProgress', () => {
  it('detects right swipe and positive rotation under threshold', () => {
    const progress = calculateSwipeProgress(50);
    expect(progress.direction).toBe('right');
    expect(progress.isPastThreshold).toBe(false);
    expect(progress.ratio).toBeCloseTo(50 / SWIPE_THRESHOLD_PX, 2);
    expect(progress.rotation).toBeGreaterThan(0);
    expect(progress.rotation).toBeLessThanOrEqual(MAX_ROTATION_DEG);
  });

  it('detects left swipe and negative rotation past threshold', () => {
    const progress = calculateSwipeProgress(-150);
    expect(progress.direction).toBe('left');
    expect(progress.isPastThreshold).toBe(true);
    expect(progress.ratio).toBe(1);
    expect(progress.rotation).toBe(-12);

    const clamped = calculateSwipeProgress(-250);
    expect(clamped.rotation).toBe(-MAX_ROTATION_DEG);
  });

  it('handles zero displacement', () => {
    const progress = calculateSwipeProgress(0);
    expect(progress.direction).toBe('none');
    expect(progress.ratio).toBe(0);
    expect(progress.isPastThreshold).toBe(false);
    expect(progress.rotation).toBe(0);
  });
});

describe('calculateDeckStats', () => {
  it('calculates accuracy and completion correctly', () => {
    const results = {
      0: 'know',
      1: 'know',
      2: 'review',
      3: 'pass',
    };
    const stats = calculateDeckStats(10, results);
    expect(stats.total).toBe(10);
    expect(stats.answered).toBe(4);
    expect(stats.mastered).toBe(2);
    expect(stats.needsReview).toBe(1);
    expect(stats.passed).toBe(1);
    // accuracy = mastered / (mastered + needsReview) = 2 / 3 = 67%
    expect(stats.accuracy).toBe(67);
    expect(stats.progressPercent).toBe(40);
    expect(stats.isComplete).toBe(false);
  });

  it('marks complete when all cards are answered', () => {
    const results = ['know', 'know', 'review'];
    const stats = calculateDeckStats(3, results);
    expect(stats.isComplete).toBe(true);
    expect(stats.progressPercent).toBe(100);
    expect(stats.accuracy).toBe(67);
  });
});

describe('filterMissedCards', () => {
  it('extracts only cards marked with "review"', () => {
    const deck = [
      { question: 'Q1', answer: 'A1' },
      { question: 'Q2', answer: 'A2' },
      { question: 'Q3', answer: 'A3' },
    ];
    const results = { 0: 'know', 1: 'review', 2: 'know' };
    const missed = filterMissedCards(deck, results);
    expect(missed).toHaveLength(1);
    expect(missed[0].question).toBe('Q2');
  });
});
