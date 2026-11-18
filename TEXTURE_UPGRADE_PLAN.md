# Embraer E2 Cockpit Texture & Shading Upgrade Plan

## 1. Root-Cause Analysis of Previous Visual Artifacts

When applying SVG gradients globally across `painel_svg.svg`, three geometry traits inherited from the original LibreOffice Draw export caused visual defects:

### 1.1 False Mid-Panel Division Lines (`FUEL`, `PASSENGER SIGNS`, `WINDSHIELD WIPER`, `HYDRAULIC`, `PRESSURIZATION`, `AUTOBRAKE`)
- **Cause**: In `painel_svg.svg` (lines `9525–9566` and `7952–7955`), several sub-panel faces (`fill="rgb(150,150,150)"`) were originally drawn in LibreOffice by placing **two or three adjacent half-paths side-by-side** (left half + right half, or top half + bottom half) with `stroke="none"`.
- **Why gradients exposed the seam**: SVG `<linearGradient>` defaults to `gradientUnits="objectBoundingBox"`, which computes a separate `0% -> 100%` gradient per `<path>`. Where the dark right edge (`100%`) of the left half-path touches the bright left edge (`0%`) of the right half-path, a sharp vertical or horizontal split line appears.
- **Prevention**: Use a **uniform solid matte E2 slate-blue fill (`#5c6e7e`)** for sub-panel faces (matching the flat matte sub-panel fills in `EM_E2190_Cockpit_INTERACTIVE.pdf`). With a uniform solid color, adjacent half-paths blend with zero visible seam.

### 1.2 Rotary Knob Internal Seams & Double-Circle Halos (`XFEED`, `PTU`, `EMER LT`, `MODE`)
- **Cause 1 (Segmented Knob Slices)**: Each rotary knob in `painel_svg.svg` (lines `9567–9640`) is constructed from **3 separate adjacent `<path>` slices** (`rgb(199,199,199)`: left crescent, right crescent, and lower tapered pointer skirt). Applying an `objectBoundingBox` radial gradient to `rgb(199,199,199)` gave each of the 3 pieces its own separate radial center.
- **Cause 2 (Double-Circle Overlap)**: Out of the 30 Overhead rotary knobs, **22 knobs already have a filled circular base**, while only **8 knobs** (`AC PUMP 1`, `AC PUMP 2`, `FUEL TRANSFER`, `WIPER 1`, `WIPER 2`, `ICE MODE`, `CABIN ALT`, `LFE`) have an unfilled outer rim (`fill="none"` at lines `15618–15717`). Injecting a base `<circle>` behind all 30 knobs created a second offset circle behind the pointer skirt of the 22 complete knobs.
- **Prevention**: Keep `rgb(199,199,199)` as a **solid light E2 knob color (`#d4dce3`)** so the 3 knob slices remain seamless, and insert a circular base fill **only for the 8 hollow knobs**.

### 1.3 Striped Red Switch Guards (`ENG PUMP SHUTOFF`, `DUMP`, `APU EMER STOP`)
- **Cause**: The red switch guards are drawn as multiple overlapping rectangular lattice bars (`rgb(255,0,0)`). Replacing `rgb(255,0,0)` globally with a gradient caused each lattice bar to shade independently.
- **Prevention**: Keep `rgb(255,0,0)` switch guards solid red, and apply lens glow **only** to the 2 Master Warning (`L1607`, `L1619`) and 2 Master Caution (`L1609`, `L1621`) single-path lenses.

---

## 2. Phased Implementation Plan (4 Small, Independent Tasks)

Each task below modifies a single visual layer, runs the full test suite (`npm test` + `npm run build` + MCP `validate_project`), and pauses for your visual review before moving to the next task.

### Task 1: Authentic E2 Slate-Blue Color Palette (Solid Fills Only)
**Goal**: Replace the flat grey LibreOffice colors with the authentic Embraer E2 slate-blue color hierarchy from `EM_E2190_Cockpit_INTERACTIVE.pdf` using **100% solid fills** so multi-part panels have **zero seams**.

| Cockpit Layer | Current SVG Color | New Solid E2 Color | Target Elements |
| :--- | :--- | :--- | :--- |
| **Glareshield Hood** | `rgb(171,171,171)` (`L10`) | `#35404b` (Dark Slate Hood) | Glareshield upper anti-glare structure |
| **Main Structural Frames** | `rgb(171,171,171)` (`L11`, `L14`) | `#4b5968` (Structural Slate) | Main Instrument Panel & Control Pedestal frames |
| **Sub-Panel Outer Bevels** | `rgb(128,128,128)` | `#3f4d5b` (Deep Bevel Slate) | Outer rims of Overhead, MIP, and Pedestal sub-panels |
| **Sub-Panel Matte Faces** | `rgb(150,150,150)` | `#5c6e7e` (E2 Panel Slate-Blue) | All Overhead, Glareshield, MIP, and Pedestal sub-panel faces |
| **Display Unit Bezels** | `rgb(209,209,209)` / `rgb(150,150,150)` (`L12..L20`) | `#2b3540` / `#1f2730` | Outer and inner PFD/MFD display frames |
| **Recessed Cavities / Tracks** | `rgb(102,102,102)` / `rgb(95,95,95)` | `#2c3640` / `#252e37` | Lever slots, push-button wells, recessed cavities |
| **Rotary Knob & Switch Bodies** | `rgb(199,199,199)` | `#d4dce3` (Cool E2 Light Grey) | Seamless solid fill across all 3-part rotary knobs & toggles |

- **Verification after Task 1**: Confirm zero vertical or horizontal division lines in `FUEL`, `PASSENGER SIGNS`, `WINDSHIELD WIPER`, `HYDRAULIC`, `PRESSURIZATION`, and `AUTOBRAKE`.

---

### Task 2: Fill Only the 8 Hollow Overhead Rotary Knobs
**Goal**: Fix the 8 Overhead rotary knobs whose circular body currently has `fill="none"` so the panel background no longer shows through them, without touching the 22 knobs that already have complete geometry.

- **Target Knobs (8 total)**:
  1. `fuel-ac-pump1` (`x=2982, y=12611`)
  2. `fuel-ac-pump2` (`x=4628, y=12611`)
  3. `fuel-transfer` (`x=3807, y=13587`)
  4. `wiper-left` (`x=6329, y=12541`)
  5. `wiper-right` (`x=7907, y=12541`)
  6. `ice-mode` (`x=11200, y=16462`)
  7. `press-cabin-alt` (`x=9828, y=14887`)
  8. `press-lfe` (`x=11329, y=15721`)
- **Implementation**: Insert a solid `#d4dce3` circle matching each knob's exact outer ring directly after the last Overhead sub-panel face (`L9566`) so the knob body sits above the panel face and below the pointer stripe.
- **Verification after Task 2**: Inspect the Overhead panel to verify all 30 rotary knobs look uniform with no double circles or pointer cutoffs.

---

### Task 3: Corner Dzus Fasteners & Screws Shading
**Goal**: Add subtle 3D metallic depth to the circular panel corner fasteners without affecting any multi-part panel or knob geometry.

- **Implementation**:
  - Target only the self-contained circular fastener `<path>` elements (`rgb(178,178,178)` in Overhead `L9650..L10550` and `rgb(186,186,186)` screw heads).
  - Apply a subtle metallic radial gradient (`#e2-dzus-chrome`: `#ced7e0 -> #8d9aa6 -> #4e5b68`) since each fastener ring is a single closed circular path.
- **Verification after Task 3**: Check that corner fasteners have crisp metallic depth with no stray artifacts.

---

### Task 4: Master Warning/Caution Glow & Lever Grip Shading
**Goal**: Add targeted 3D highlights to single-path controls only.

- **Target Elements (Exact Line Match Only)**:
  - **Master Warning Lenses** (`L1607` and `L1619`): Radial red lens glow (`#ff6b6b -> #e61919 -> #990000`).
  - **Master Caution Lenses** (`L1609` and `L1621`): Radial amber lens glow (`#ffd466 -> #ff9900 -> #b35900`).
  - **White Lever Grips** (Thrust Levers, Slat/Flap Lever, Speedbrake Lever): Vertical cylindrical highlight (`#ffffff -> #e6ecf2 -> #aebbc7`).
  - **Red Switch Guards**: Kept solid red (`#e01b1b`) so lattice bars remain uniform.
- **Verification after Task 4**: Full visual check across Glareshield, MIP, Pedestal, and Overhead panels, plus `npm test`, `npm run build`, and `validate_project`.
