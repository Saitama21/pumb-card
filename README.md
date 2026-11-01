# CNC Toolbox Pro · CAD Constructor

**Mobile-first offline-first PWA for SINUMERIK 828D operators.** The repository has been repurposed from Button Motion Lab for this dedicated application.

## Available in v0.1
- Edit a *full axial turning profile* through ordered outside-diameter cylinders/steps and conical sections (X diameters / lengths).
- Add through axial bore, external ring grooves and internal ring grooves, each with explicit Z position, width and diameter.
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
- `src/app.js` interface and editable operation tree
- `src/preview.js` faithfully reconstructed Three.js LatheGeometry preview from profile points
- `src/cad.worker.js` **real** Open CASCADE B-Rep revolved solid and STEP Blob
- `scripts/build-sw.mjs` offline version-coherent asset manifest generated after Vite build
- `tests/` geometry, responsive and real STEP export regression

Licensing: project-specific app code is independent. **replicad**: MIT; **replicad-opencascadejs / Open CASCADE**: LGPL-2.1-only; **Three.js**: MIT. Respect the full upstream third-party license and source-obligation notices when distributing binary assets. No AI, API key, backend, paid subscription, or external runtime CDN.
