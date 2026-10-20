# Embraer E2 Cockpit Panel — Interactive Study App

An interactive web application for studying the **Embraer E-Jets E2** cockpit panels (Overhead, Glareshield, Main Instrument Panel, and Control Pedestal). Built with **React**, **Vite**, and **react-zoom-pan-pinch**.

---

## Features

- **High-Resolution Vector Cockpit Panel**: Full SVG cockpit layout (`painel_svg.svg`) with crisp rendering at any zoom level (up to `12x` zoom).
- **Smooth Pan & Zoom**: Mouse wheel zoom, pinch-to-zoom, and click-and-drag panning across all cockpit zones.
- **142+ Interactive Controls**: Clickable hotspots over switches, guarded buttons, rotary selectors, fire handles, displays, MCDUs, and flight controls.
- **Instant System Reference Modal**: Clicking any highlighted control displays its **Panel / System Category**, **Title**, and **Operational Description** from `src/data/manual.json`.

---

## Covered Aircraft Systems & Panels

- **Overhead Panel**:
  - Electrical (`IDG 1/2`, `APU GEN`, `AC GPU`, `TRU 1/2/ESS`, `BATT 1/2`, Bus Ties)
  - Fire Protection (`Engine 1 & 2 Fire Handles`, `Cargo Smoke FWD/AFT`, `APU Fire EXTG & EMER STOP`)
  - APU Control (`APU Master`, `Fuel Shutoff`, `Emergency Stop`)
  - Fuel System (`XFEED`, `AC Pump 1/2`, `DC Pump`)
  - Hydraulic System (`SYS 1/2/3 Electric & Engine Pumps`, `PTU`)
  - Pneumatic & Air Conditioning (`PACK 1/2`, `BLEED 1/2/APU`, `XBLEED`, `CREW OXY`, `CABIN/CKPT TEMP`, `RAM AIR`)
  - Pressurization (`CABIN ALT Mode`, `LFE`, `MAN Rate`, `DUMP`)
  - Anti-Ice & Ice Protection (`WING`, `ENG 1/2`, `ADS Probes`, `Windshield Heating`, `Wipers`)
  - Exterior, Interior & Passenger Signs (`LANDING`, `TAXI`, `NAV`, `STROBE`, `RED BCN`, `LOGO`, `INSP`, `EMER LT`, `FASTEN BELTS`, `STERILE`)
  - CVR (`ERASE`, `TEST`) & ELT
- **Glareshield Panel**:
  - Master Warning (`WARN`) & Master Caution (`CAUT`)
  - Left & Right IESS / Display Control Panels
  - Flight Guidance Control Panel (`AP`, `AT`, `FD`, `YD`, `SRC`, `FPA`, `SPD`, `HDG`, `ALT`, `V/S`, `NAV`, `APP`, `VNAV`, `FLCH`, `BANK`)
- **Main Instrument Panel**:
  - Display Units (`DU 1` PFD, `DU 2` MFD, `DU 3` EICAS, `DU 4` MFD, `DU 5` PFD) & `IESI`
  - Display Reversionary (`REV`), `CHRONO`, and `EICAS FULL` Controls
  - `RAT MANUAL DEPLOY` Lever
  - Landing Gear Lever, `ALTN GEAR EXT`, and `GPWS / GSPD INHB`
  - Autobrake (`RTO / OFF / LOW / MED / HI`)
- **Control Pedestal**:
  - Dual CCD (Cursor Control Devices) & Dual MCDU (Multipurpose Control and Display Units)
  - Weather Radar / Terrain Control Panel
  - Dual Audio Control Panels (`ACP 1` & `ACP 2`)
  - Thrust Levers (`TOGA`, `AT DISC`), Speedbrake (`SPDBRK`), and Flap Selector (`0` to `FULL`)
  - Engine Start/Stop Selectors (`ENG 1/2`) & Ignition (`IGN`)
  - Emergency / Parking Brake Handle & Light
  - Pitch, Roll, and Yaw Trim Panel (`PRI / SEC /OFF`)
  - Cockpit Door Control Panel & Control Disconnects (`ELEVATOR DISC`, `AILERON DISC`, `STick Shaker Cutout`)

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

## Deployment (GitHub Pages)

This repository includes a GitHub Actions workflow ([`.github/workflows/deploy.yml`](./.github/workflows/deploy.yml)) that automatically builds and deploys the app to **GitHub Pages** on every push to `main`.

1. Push the repository to GitHub.
2. Go to **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, select **GitHub Actions**.

