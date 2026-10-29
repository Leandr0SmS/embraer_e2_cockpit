# Embraer E2 Cockpit Panel — Interactive Study App

An interactive web application for studying the **Embraer E-Jets E2** cockpit panels (Overhead, Glareshield, Main Instrument Panel, and Control Pedestal). Built with **React**, **Vite**, and **react-zoom-pan-pinch**.

> [!WARNING]
> **⚠️ Disclaimer — For Informational Use Only**
>
> This application is an independent educational reference tool and is **not** an official publication. System descriptions may be simplified and can vary by aircraft configuration, serial number, or avionics load.
>
> **Do not use for real-world flight operations. Always consult the official, current approved Airplane Flight Manual (AFM), Aircraft Operating Manual (AOM), QRH, and your operator's manuals for actual airplane operation.**

---

## How to Use

Welcome to the interactive **Embraer E-Jets E2** cockpit study guide. Explore the Overhead Panel, Glareshield, Main Instrument Panel, and Control Pedestal:

- **Pan & Zoom:** Scroll or pinch to zoom in on any panel, and drag to move around the flight deck.
- **Inspect Controls:** Click any highlighted switch, button, knob, lever, or display to read its system overview and function.
- **Cockpit Flows:** Use the upper **Flows** menu to study all **11 standard Embraer E195-E2 Cockpit Flows**:
  1. `Internal Safety Inspection`
  2. `Power up`
  3. `Before Start (to the line)`
  4. `Before Start (Below the line)`
  5. `After Start`
  6. `Before Takeoff`
  7. `After Takeoff`
  8. `FL100 - Climb`
  9. `FL100 - Descent`
  10. `After Landing`
  11. `Shutdown`
  - Filter by crew role (**All**, Green **LSP / PF Actions**, or Yellow **RSP / PM Actions**).
  - Choose **Step-by-Step** mode to reveal each numbered badge, scan-flow arrow, and bottom checklist item one step at a time (`Next Arrow ▶`, keyboard `ArrowRight`/`ArrowLeft`, or clicking the pulsing active badge on the panel), or switch to **Entire Flow** mode to see the complete procedure at once.
  - Toggle **`⌖ Follow`** (enabled by default) to automatically pan the camera to center each active step badge in the viewport, or turn it off for manual camera positioning.

---

## Features

- **High-Resolution Vector Cockpit Panel**: Full SVG cockpit layout (`painel_svg.svg`) with crisp rendering at any zoom level (up to `12x` zoom).
- **Smooth Pan & Zoom**: Mouse wheel zoom, pinch-to-zoom, and bounded click-and-drag panning across all cockpit zones.
- **153+ Interactive Controls**: Clickable hotspots over switches, guarded buttons, rotary selectors, fire handles, displays, MCDUs, and flight controls.
- **Interactive Cockpit Flows (`src/data/flows.json`)**: Animated vector scan-flow arrows, numbered role-colored step badges (`LSP`/`PF` green, `RSP`/`PM` yellow), auto-centering camera follow mode, and a progressive bottom checklist dock with one-click `ℹ️` manual inspection.
- **Instant System Reference Modal**: Clicking any highlighted control displays its **Panel / System Category**, **Title**, and **Operational Description** from `src/data/manual.json`.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or v20+ recommended)

### Installation

```bash
npm install
```

### Run Development Server

```bash
npm run dev
```

Open the local URL shown in the terminal (typically `http://localhost:5173`).

### Build for Production

```bash
npm run build
npm run preview
```

---

## Customizing Descriptions

All control titles, system categories, and descriptions are stored in [`src/data/manual.json`](./src/data/manual.json), keyed by the matching `<g id="..." class="clickable">` element ID in [`painel_svg.svg`](./painel_svg.svg):

```json
{
  "fire-eng1-handle": {
    "title": "Engine 1 Fire Extinguisher Handle",
    "system": "Fire Protection",
    "description": "Pulling shuts off Engine 1 fuel, hydraulic, and bleed air..."
  }
}
```

---

## Author

[Leandro Simões](https://github.com/Leandr0SmS)

## License

[MIT License](https://github.com/Leandr0SmS/embraer_e2_cockpit/blob/main/LICENSE)

## Inspirations

- [Embraer](https://embraer.com)
- [FreeCodeCamp](https://www.freecodecamp.org/learn/)
