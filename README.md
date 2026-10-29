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

---

## Features

- **High-Resolution Vector Cockpit Panel**: Full SVG cockpit layout (`painel_svg.svg`) with crisp rendering at any zoom level (up to `12x` zoom).
- **Smooth Pan & Zoom**: Mouse wheel zoom, pinch-to-zoom, and click-and-drag panning across all cockpit zones.
- **153+ Interactive Controls**: Clickable hotspots over switches, guarded buttons, rotary selectors, fire handles, displays, MCDUs, and flight controls.
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
