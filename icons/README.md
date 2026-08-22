# Icon masters

`square.svg` is the app icon. `maskable.svg` is the Android variant, which is a
separate drawing rather than a crop, for the reasons written into the file.
Both are 1024 square with an opaque white ground, and both carry their own
notes about why the numbers are what they are.

`public/favicon.svg` is `square.svg` with the ground behind a
`prefers-color-scheme` query, since a vector favicon is the one icon here a
browser re-renders and can therefore follow the theme.

## Rendering the PNGs

Headless Chrome, because it is the same engine that will draw the favicon and
it needs nothing installed. An SVG handed straight to a renderer can come back
at whatever size it feels like, so the file goes into a page sized to the
viewport instead, and the output size is checked afterwards rather than
assumed:

    chrome-headless-shell --disable-gpu --hide-scrollbars \
      --force-device-scale-factor=1 --window-size=512,512 \
      --screenshot=public/icon-512.png page.html

where `page.html` is the SVG inlined under
`html,body{margin:0}svg{width:100vw;height:100vh}`.

| Output | From | Size |
|---|---|---|
| `public/apple-touch-icon.png` | `square.svg` | 180 |
| `public/icon-192.png` | `square.svg` | 192 |
| `public/icon-512.png` | `square.svg` | 512 |
| `public/icon-maskable-512.png` | `maskable.svg` | 512 |

Worth re-checking after any change: every PNG is exactly its named size, no
pixel is less than fully opaque, and in the maskable one nothing red, yellow or
pink reaches further than 40% of the width from the centre. Navy is expected
out there — that is the card leaving the frame.
