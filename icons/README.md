# Icon masters

`square.svg` is the app icon: the export's four paths verbatim, in their own
1024 coordinates, with one white rectangle behind them. `maskable.svg` is the
same four paths moved and scaled as a group for Android. Both files carry their
own notes on why they are the way they are.

`public/favicon.svg` is `square.svg` with the ground behind a
`prefers-color-scheme` query, since a vector favicon is the one icon here a
browser re-renders and can therefore follow the theme.

**Do not rebuild the cards from their visible bands.** Each card is 300 deep
and the next covers all but 212 of it; that overlap is what fills the notch at
each card's shoulder with the colour of the card above. Redraw them as their
visible 212 and the notches show the ground, which at icon sizes turns the deck
into four loose stripes. Edit the transform, never the path data.

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
pixel is less than fully opaque, nothing but ground falls outside 40% of the
width from the centre of the maskable one, and the notch above each card is the
colour of the card above rather than white.
