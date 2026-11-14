# 🎂 Birthday Cake for Mom

A little 3D birthday web page: type-out intro, a cake that drops onto a table in front of the
Shanghai Bund at night, a candle to blow out, fireworks, a pop-up birthday card, and a strip of
film on the table — tap any photo and it floats up above the cake.

Forked from [tinabyte/birthday-cake-from-crush](https://github.com/tinabyte/birthday-cake-from-crush). Thanks Tina it's so cute.

## Make it yours

1. **Photos** – put your photos in `public/` and list them in `FILM_PHOTOS` in
   [`src/config.ts`](src/config.ts). `thumb` is the small image on the film (~800px),
   `full` is the one shown when tapped (~1600px). Landscape and portrait both work.
2. **Card** – edit `CARD` in `src/config.ts` (title, paragraphs, signature, date, photo).
3. **Intro text** – `TYPED_LINES` in `src/config.ts`.
4. **Table card** – replace `public/card.png` (about 1748×1240).
5. **Music** – not included. Drop an audio file at `public/music.mp3` to play one.
6. **Background** – any 2:1 equirectangular panorama works; see `BACKGROUNDS` in `src/config.ts`.
   Give phones a ≤4096px-wide copy via `fileSmall` — 8K textures often crash mobile browsers.

## Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The `dist/` folder is a static site with relative paths, so it can be hosted anywhere
(Netlify, GitHub Pages, any static host). It must be served over http(s) — opening
`index.html` directly from disk won't load the 3D models.

## Credits

- Original project: [tinabyte/birthday-cake-from-crush](https://github.com/tinabyte/birthday-cake-from-crush)
- "Birthday Candle" model by [koelooptiemanna](https://sketchfab.com/koelooptiemanna) on
  [Sketchfab](https://sketchfab.com/3d-models/birthday-candle-71567160d88644ac8c150cfd4090b9a9), licensed
  [CC BY 4.0](http://creativecommons.org/licenses/by/4.0/)
- "Shanghai Bund" HDRI by Greg Zaal, [Poly Haven](https://polyhaven.com/a/shanghai_bund) (CC0), converted to JPG
- Built with React, three.js, react-three-fiber and drei
