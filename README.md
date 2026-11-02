# CNC Toolbox Pro · CAD Constructor

**Mobile-first offline-first PWA for SINUMERIK 828D operators.** The repository has been repurposed from Button Motion Lab for this dedicated application.

## v0.4 · ShopTurn process planner and X/Z contour editor
- New independent **ShopTurn** workspace: ordered, editable operation cards for facing, roughing, finishing, centric drilling, internal boring, grooving, threading and parting. Tool T, cutting edge D, feed F and speed S are included; order can be changed.
- Configurable ShopTurn-inspired program header with **G54 locked** and XA/XI/ZA/ZI/ZB, XRA/XRI/ZRA/ZRI, safety clearance SC and tool-change mode MCS/WCS. Unknown XT/ZT are intentionally left **blank**, never treated as measured zero values.
- Geometric X/Z contour editor: lines and circular arcs (R), diameter X coordinates, dimensionally consistent SVG visualization, editable nodes and transfer from existing CAD profile. Canvas/CAD origin and machine-workpiece origin remain conceptually distinct.
- The operation plan autosaves offline and exports machine-*non-executable* TXT/JSON. The CAD project and existing STEP export remain independent; no unverified NC toolpaths or collision guarantees are claimed.
- Unit checks, build and browser smoke are required before release. Production machining still requires verification of tool geometry, spindle/chuck setup, offsets and simulation on the real SINUMERIK 828D.

## v0.4 · ShopTurn operation planner (educational / not executable NC)
- New **ShopTurn** workspace in the original independent five-tab bottom dock. The existing CAD/3D/STEP workflow is unchanged.
- Editable, ordered process steps: facing, CYCLE952 roughing/finishing, drilling, internal boring, CYCLE930 grooves, CYCLE99 threading and CYCLE92 parting. Each card stores tool T, cutting edge D, feed F in mm/rev and spindle S, plus cycle-specific inputs.
- **G54-only** program header with stock XA/XI/ZA/ZI/ZB, retract XRA/XRI/ZRA/ZRI/SC, spindle cap, optional XT/ZT and MCS/WCS reference. XT/ZT remain unset until measured; no automatic machine-safe defaults.
- Dedicated **X/Z contour** editor: starting point, lines, clockwise and counterclockwise radius arcs; exact physical-radius/diameter conversion and geometric validation; live SVG preview; optional geometry transfer from the current CAD model.
- Local autosave and JSON/TXT export. Geometry-version mismatch warning and pre-machining verification checklist.
- Important: this is a **non-executable process plan, not a ShopTurn/NC postprocessor**, machine toolpath simulator or collision checker. Validate on the actual Siemens 828D before any run. The baseline Siemens Turning manual here is 02/2012 (V4.5); user's OEM software V04.95 may differ.
- Node regression tests and additional mobile/desktop browser smoke tests cover ShopTurn.

## v0.3 · Premium live X/Z blueprint
- Interactive, exact **live SVG blueprint** above the editing controls, driven by the same axial model as 3D and STEP. Selected outer step, inner bore, OD/ID groove highlighted with precise Z start/end, length and diameter.
- Tap any operation to highlight it, or select a region of the blueprint and tap **Edit**. Expandable compact operation groups reduce unnecessary scrolling on mobile.
- **Z0 from left or right**: preference changes displayed/editable Z distances relative to the chosen face, but keeps canonical geometry measured from the left; conversion is reversible. Machine G54 is intentionally not tied to the CAD drawing origin.
- Fixed independent bottom dock remains `position:fixed;left:50%;transform:translateX(-50%);bottom:2px;width:87%;height:68px`.
- iPhone header adjusted to prevent the OFFLINE badge overlapping the engineering workspace subtitle.

## Available in v0.2 · Full dimensional turning
- **Complete axial inside and outside profile** built exclusively from user-entered numbers. Outer stepped cylinders and tapers; base through-hole; multiple ID boring sections with per-segment Z start, axial depth and diameter; conical inner transitions.
- **Blind holes from either face** with a precise flat bottom, and multi-stage stepped through holes. No invented drawing dimensions.
- **Geometry guards:** reject enclosed internal cavities, overlapping boring segments, missing access to a face, and cases where inner/outer cutting features collapse the wall.
- **Migration:** old v0.1 JSON projects load unchanged; new `innerSections` array defaults to empty.
- **STEP regression:** browser-driven edit of an internal dimension, creation through Open CASCADE and validation that the shared file contains an ISO-10303-21 STEP document.

## Previously available in v0.1
- Edit a *full axial turning profile* through ordered outside-diameter cylinders/steps and conical sections (X diameters / lengths).
- Add through axial bore, dimensional internal sections, external ring grooves and internal ring grooves, each with explicit Z position, width and diameter.
- Exact parametric validation of lengths, positive diameters, groove bounds and wall intersection; machine-readable JSON model source.
- Interactive WebGL 3D orbit viewer (Three.js) plus dimensional axial section; previews and CAD export derive from the same parameterized profile.
- **Real boundary-representation STEP**, built by replicad / Open CASCADE in a Web Worker via profile revolution and shape.blobSTEP(). Never export a mere tessellated mesh as STEP.
- Share the generated .step file through the iOS share sheet (eDrawings if offered), or download and open it via Files.
- Autosave current model locally, JSON import/export, Graphite/Titanium visual themes, accessible keyboard input.
- Independent bottom dock using exactly: `position:fixed;left:50%;transform:translateX(-50%);bottom:2px;width:87%;height:68px`.
- Build-time precache of all Vite bundles, fonts, images, Workers and CAD WASM for subsequent offline launches (initial install requires internet).

## Not yet supported
This first verified *turning module* does **not** yet implement helical threads, blind drilling, cross-drilled holes, chamfer/fillet features, sketch constraints, arbitrary milling features or an assembly engine. Those require separate verified modelling modules. The exported 3D geometry must be checked against the engineering drawing; it is not a CNC toolpath or manufacturing guarantee.

## Development

```bash
npm install
npm run dev
npm run check
npm run build
npm run preview
npm run smoke
```

Deployment: GitHub Actions tests and uploads the built `dist/` to GitHub Pages on pushes to `main`, after the GitHub Pages source is configured to **GitHub Actions**.

Architecture:
- `src/model.js` pure parametric profile, validation and immutable import
- `src/app.js` CAD interface and editable geometry feature tree
- `src/shopturn-core.js` immutable validated ShopTurn process and X/Z contour mathematics
- `src/shopturn.js`, `shopturn.css` operation planner and touch-first contour editor
- `src/preview.js` faithfully reconstructed Three.js LatheGeometry preview from profile points
- `src/cad.worker.js` **real** Open CASCADE B-Rep revolved solid and STEP Blob
- `scripts/build-sw.mjs` offline version-coherent asset manifest generated after Vite build
- `tests/` geometry, responsive and real STEP export regression

Licensing: project-specific app code is independent. **replicad**: MIT; **replicad-opencascadejs / Open CASCADE**: LGPL-2.1-only; **Three.js**: MIT. Respect the full upstream third-party license and source-obligation notices when distributing binary assets. No AI, API key, backend, paid subscription, or external runtime CDN.
