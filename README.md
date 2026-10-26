# Spira — coming soon

A presentation-only product launch page for the current Spira natural-fiber shaker concept. Cream, dark olive and tactile product imagery, with interactive Three.js views of the actual revision 4 geometry.

## Run locally

Requires Node.js 20 or newer. No package installation or build step is needed.

```sh
npm start
```

Open `http://localhost:4173`. Set `PORT` to change the port. The server binds to loopback by default.

```sh
npm run check
```

This checks local assets and anchors, scope restrictions, JS syntax, product geometry and text contrast.

## What works

- Real-time product rotation by dragging, arrow keys or labeled rotation buttons.
- Whole, cutaway and exploded views; main lid separation and screw-cap removal.
- Detail selectors with synchronized explanations and keyboard-accessible native controls.
- Native FAQ disclosures, reduced-motion support, lazy rendering and an image fallback if WebGL fails.
- No checkout, email collection, analytics, countdown or invented release date.

## Source structure

- `dist/index.html`: complete page content and accessible landmarks.
- `dist/style.css`: responsive layout and design tokens.
- `dist/app.js`: interaction state and lazy viewer initialization.
- `dist/assets/spira-model.js`: geometry extracted from the current review model, shared by every viewer.
- `dist/assets/viewer.js`: lighting, camera, input and bounded user-triggered transitions. No permanent animation loop.
- `docs/product-design.md`: product assumptions and unresolved validation questions.

The cap covers the outside of the spout and meets its rim. It is not the older hinged plug closure. The 3D model is a geometric study, not released manufacturing CAD. No physical sealing, strength, food-contact or compostability result is implied. The campaign image is AI-generated and approximates small mechanical details.

## Design reference

[Figma palette, spacing and typography reference](https://www.figma.com/design/6QMBGJACBhmxduT3ag7NHw?node-id=2-18)

This Figma file holds launch foundations; the website and shared geometry are the source of truth for implementation. No pre-existing Figma component system or Code Connect mapping was supplied. Stark was unavailable in the plugin search; contrast and keyboard checks were performed directly.

## Hosting

GitHub Pages is deployed by `.github/workflows/jekyll-gh-pages.yml` on pushes to `main`. Despite its original filename, this is now a static deployment: it checks the site and uploads **only `dist/`** as the Pages artifact. Keep Pages' publishing source set to **GitHub Actions**. A root-level Jekyll build would publish this README instead of the landing page.

Deploy `dist/` to any static host. Its assets use relative paths. The tracked `.openai/hosting.json` identifies the separate private Sites preview. Canonical and Open Graph URLs in `index.html` should be updated if the public origin changes.

Three.js and Manrope are vendored for a self-contained page. Their license files accompany the assets. The server and checks use Node built-ins only.
