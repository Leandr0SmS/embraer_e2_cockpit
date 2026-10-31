# Embraer E2 Cockpit — Flashcards Study Mode Specification & Implementation Plan

## 1. Overview & Product Idea

The **Flashcards Study Mode** expands the Embraer E-Jets E2 Cockpit Study Guide from panel inspection and procedural scan flows into active knowledge retrieval and operational testing. Inspired by **NotebookLM's study flashcards**, the interface delivers an intuitive, tactile, gesture-driven review system for critical aircraft knowledge.

### Key Capabilities

- **Two Authoritative Decks**:
  - **Memory Items (15 cards)**: Emergency and abnormal recall actions (Smoke/Fire/Fumes, Dual Engine Failure, Cabin Altitude HI, Emergency Descent, etc.) loaded from [`src/data/flashcards-memory.json`](src/data/flashcards-memory.json).
  - **Aircraft Limitations (62 cards)**: Weight limits (MRW, MTOW, MLW, MZFW), airspeed ceilings ($V_{MO}$, $V_{LO}$, $V_{LE}$, Flap limits), powerplant, electrical, fuel, environmental, and crosswind limits loaded from [`src/data/flashcards-limitations.json`](src/data/flashcards-limitations.json).
- **NotebookLM-Style Card Mechanics**:
  - **Click / Tap to Flip**: Smooth 3D perspective flip revealing the question on the front and operational answer on the back with structured newline (`\n`) formatting.
  - **Drag / Swipe Gestures** (Mouse & Touch):
    - **Swipe Right (→)**: "I Know This" (Correct) — card rotates right, surfaces a green checkmark pill, and moves to the Mastered pile.
    - **Swipe Left (←)**: "Review Again" (Wrong) — card rotates left, surfaces an amber/red review indicator, and is queued for re-study.
  - **On-Screen Control Buttons**: For desktop users who prefer point-and-click or accessibility (Pass / Flip / Correct / Wrong).
  - **Keyboard Navigation**:
    - `Space` or `Enter`: Flip card.
    - `ArrowRight`: Mark Correct / Next.
    - `ArrowLeft`: Mark Wrong / Review.
    - `ArrowDown` or `P`: Pass / Skip without recording a score.
- **Session Progress & Mastery Summary**:
  - Real-time progress bar (`Card X of Y`), accuracy rate, and visual count of Correct vs. Review items.
  - End-of-deck summary with score percentage, breakdown, and one-click options to **"Review Missed Cards"** or **"Restart Deck (Shuffle)"**.
- **Unified Navigation**:
  - Switch seamlessly in the top header between **Cockpit / Flows** and **Flashcards**.

---

## 2. Architecture & Data Flow

```md
+-------------------------------------------------------------+
|                      Top Navigation Bar                     |
|  [Cockpit & Flows Mode]  <-------->  [Flashcards Study Mode] |
+-------------------------------------------------------------+
                               |
              +----------------+----------------+
              |                                 |
              v                                 v
     [Deck Selector]                   [Session Actions]
  - Limitations (62)                  - Shuffle Toggle
  - Memory Items (15)                 - Reset Progress
              |
              v
     +---------------------------------------------------+
     |               Active Flashcard Stage              |
     |                                                   |
     |   +-------------------------------------------+   |
     |   |               [3D Card]                   |   |
     |   |  Front: Question Text                     |   |
     |   |  Back: Multi-line Answer (\n formatted)   |   |
     |   |  Gestures: Drag X (Rotation + Badges)     |   |
     |   +-------------------------------------------+   |
     |                                                   |
     |   [ ← Review Again ]  [ ↺ Flip ]  [ I Know This → ]|
     +---------------------------------------------------+
              |
              v
     +---------------------------------------------------+
     |        Deck Completion & Performance Summary      |
     |  - Accuracy Score (e.g. 87% Mastered)             |
     |  - [Review Missed Cards]   [Restart Deck]         |
     +---------------------------------------------------+
```

---

## 3. Component Hierarchy

```text
src/
├── components/
│   ├── FlashcardsView.jsx      # Main flashcard container, deck state, progress, and summary
│   ├── FlashcardCard.jsx       # 3D interactive card with touch/mouse drag physics & badges
│   ├── FlashcardDeckBar.jsx    # Deck selection pills, shuffle toggle, and restart controls
│   └── FlashcardSummary.jsx    # End-of-session performance score & review options
├── utils/
│   └── flashcardEngine.js      # Pure helper functions: deck shuffling, gesture threshold math, stats
└── data/
    ├── flashcards-memory.json       # 15 emergency recall items
    └── flashcards-limitations.json  # 62 aircraft operational limitations
```

---

## 4. Implementation Steps & Git Commit Strategy

### Step 1: Data Utilities & State Engine

- **Objective**: Create [`src/utils/flashcardEngine.js`](src/utils/flashcardEngine.js) for pure business logic:
  - Loading and validating deck structures.
  - Fisher-Yates deck shuffle algorithm.
  - Calculating swipe physics (drag displacement `dx`, velocity, rotation angles `deg = dx * 0.08`, and threshold detection `|dx| > 110px`).
  - Session scoring calculations (cards mastered, cards to review, accuracy percentage).
- **Deliverables**:
  - `src/utils/flashcardEngine.js`
  - Unit tests in `tests/flashcards.test.js` verifying shuffle integrity, scoring formulas, and swipe threshold detection.
- **Git Commit**:
  
  ```bash
  git commit -m "feat(flashcards): add flashcard engine with shuffle and swipe physics helpers"
  ```

---

### Step 2: 3D Flip & Drag-to-Review Flashcard Component

- **Objective**: Implement `src/components/FlashcardCard.jsx` with NotebookLM-style interaction:
  - CSS 3D transform (`perspective: 1000px`, `transform-style: preserve-3d`, `backface-visibility: hidden`).
  - Pointer down / touch start tracking for mouse and mobile touch.
  - Real-time drag physics: `translateX(${dx}px) rotate(${dx * 0.06}deg)` with smooth spring back when released under threshold.
  - Dynamic overlay indicators:
    - Dragging right: surfaces a floating green `KNOW` badge.
    - Dragging left: surfaces an amber/red `REVIEW` badge.
  - Preserves newline formatting (`white-space: pre-line`) for clean, readable multi-line procedures.
- **Deliverables**:
  - `src/components/FlashcardCard.jsx`
  - CSS styles in `src/App.css` for 3D flip, drag rotations, and badge animations.
- **Git Commit**:
  ```bash
  git commit -m "feat(flashcards): implement 3D flippable card with drag and swipe gesture physics"
  ```

---

### Step 3: Deck Container, Controls & Keyboard Navigation

- **Objective**: Implement `src/components/FlashcardsView.jsx` and `src/components/FlashcardDeckBar.jsx`:
  - Deck switching between **Limitations (62)** and **Memory Items (15)**.
  - Progress indicator: `Card X of Y` progress bar and mastery tallies.
  - Action dock buttons:
    - `Review (←)`: Swipe card left and register into review queue.
    - `Flip (Space)`: Toggle front/back face.
    - `Mastered (→)`: Swipe card right and register into mastered queue.
    - `Pass / Skip`: Skip card without recording as correct or wrong.
  - Keyboard listener: `ArrowLeft`, `ArrowRight`, `Space`, `Enter`, `P`.
- **Deliverables**:
  - `src/components/FlashcardDeckBar.jsx`
  - `src/components/FlashcardsView.jsx`
  - Full keyboard shortcuts support.
- **Git Commit**:

  ```bash
  git commit -m "feat(flashcards): create deck view with progress tracking, action bar, and keyboard shortcuts"
  ```

---

### Step 4: Deck Completion Summary & Re-study Options

- **Objective**: Implement `src/components/FlashcardSummary.jsx`:
  - Triggers when all cards in the deck have been answered.
  - Displays:
    - Overall score & mastery percentage (e.g. `85% Mastery`).
    - Counters for `Mastered` vs `Needs Review`.
  - Actions:
    - **"Review Missed Cards"**: Re-runs a targeted session containing only the cards marked as wrong/review.
    - **"Restart Full Deck"**: Resets progress and reshuffles the deck.
    - **"Switch Deck"**: Quick shortcut to switch to the other deck.
- **Deliverables**:
  - `src/components/FlashcardSummary.jsx`
  - Unit tests verifying filtered missed-card re-queue logic.
- **Git Commit**:

  ```bash
  git commit -m "feat(flashcards): add completion summary with smart review of missed cards"
  ```

---

### Step 5: Top Navigation Integration & View Switching

- **Objective**: Integrate the Flashcard Study Mode into the main application layout in [`src/App.jsx`](src/App.jsx) and top bar:
  - Add a primary mode switcher in the top navigation:
    - **Cockpit & Flows**: Renders the pan/zoom vector cockpit illustration and procedural scan overlay.
    - **Study Flashcards**: Renders the active flashcard view.
  - Ensures the large SVG cockpit DOM remains unmounted or inactive when in flashcards mode to maintain 60 FPS performance and zero CPU overhead.
  - Respects responsive mobile screens (portrait `@media (max-width: 600px)` and landscape `@media (max-height: 520px)`).
- **Deliverables**:
  - Update `src/App.jsx` to manage `activeTab: 'cockpit' | 'flashcards'`.
  - Update `src/components/FlowTopBar.jsx` (or unified app header) with mode toggle pills.
- **Git Commit**:

  ```bash
  git commit -m "feat(navigation): add top header mode switcher between cockpit flows and flashcards"
  ```

---

### Step 6: Test Suite & Documentation Updates

- **Objective**: Add automated test coverage and update project documentation:
  - Create `tests/flashcards.test.js` covering:
    - Data validity: all cards have non-empty questions and answers.
    - Engine logic: shuffle randomness, score calculation, threshold math.
    - Filtering and missed card isolation.
  - Update `AGENTS.md` and `README.md` to document the new flashcard feature and files.
  - Run full test validation (`npm test`) and production build check (`npm run build`).
- **Deliverables**:
  - `tests/flashcards.test.js`
  - Updates to `AGENTS.md`
- **Git Commit**:

  ```bash
  git commit -m "test(flashcards): add comprehensive tests for card deck logic and update AGENTS.md"
  ```

---

## 5. UI/UX & Interaction Specs (NotebookLM Comparison)

| Feature | NotebookLM Reference | E2 Flashcards Implementation |
| :--- | :--- | :--- |
| **Visual Style** | Minimalist dark/light card with rounded corners | Dark cockpit-themed glassmorphism card with cyan & amber accents |
| **Card Flip** | Instant 3D perspective flip on click | 3D transform (`rotateY`) with 280ms cubic-bezier transition |
| **Swipe Right** | Marks card as Known / Mastered | Drags with mouse/touch, rotates +4° to +8°, green "KNOW" pill appears |
| **Swipe Left** | Marks card as Unknown / Review | Drags with mouse/touch, rotates -4° to -8°, amber "REVIEW" pill appears |
| **Pass / Skip** | Option to skip to next card without penalty | "Pass" button and `P` / `ArrowDown` key |
| **Typography** | Clean, readable markdown text | `white-space: pre-line` with monospace badge highlights for switches/knobs |
| **Missed Cards** | One-click button to re-study wrong cards | "Review Missed Cards" creates a dedicated practice queue |
