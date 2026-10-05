# Removing Read the Room

Read the Room is an experiment. Everything it is lives in five files of its
own, and every line it needed in a shared file is tagged `READ_THE_ROOM`. This
is the whole job of taking it back out.

## 1. Delete the mode's own files

```bash
rm src/games/ReadTheRoom.tsx src/games/readTheRoomFlow.ts src/data/readTheRoom.ts src/styles/readTheRoom.css src/__tests__/readTheRoomFlow.test.ts
```

## 2. Remove every tagged line in shared files

```bash
grep -rn READ_THE_ROOM --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git .
```

After step 1, that should list only these:

| File | What to remove |
|---|---|
| `src/data/modes.ts` | The `\| "read-the-room" // READ_THE_ROOM` line at the top of the `ModeId` union. |
| `src/data/modes.ts` | Everything from `// READ_THE_ROOM start` to `// READ_THE_ROOM end` in `MODES`, both marker lines included. That is the whole registry entry, directly after Ballpark. |
| `src/App.tsx` | The `import { ReadTheRoom } … // READ_THE_ROOM` line. |
| `src/App.tsx` | The two tagged lines at the end of `renderScreen`: `case "read-the-room":` and its `return`. |
| `src/styles/tokens.css` | Everything from `/* READ_THE_ROOM start` to `/* READ_THE_ROOM end */`, both included: the five `--cat-read-the-room*` tokens and the comment above them. It sits after Hot Seat's pairing. |
| `src/__tests__/fit.test.ts` | The `"read-the-room", // READ_THE_ROOM` line in the "draws only from games that fit" test's expected list. The list can go back onto one line if you like. |
| `README.md` | The table row `\| 12 \| Read the Room \| …` under "The ten modes". |
| `README.md` | The whole `- **Read the Room** <!-- READ_THE_ROOM … -->` bullet at the end of "Mode notes", every line of it down to the blank line before "### Choosing a category". The tag only marks its first line, and the bullet's own text mentions the tag once more. |
| `GAME-CONTENT.txt` | Step 3. |

Nothing in Home needs touching. The mode was never added to `RING_ORDER`, and
the deck, the pill ring and `fit.ts` all read whatever `MODES` holds.

## 3. Delete the content section

In `GAME-CONTENT.txt`, delete from the line `READ_THE_ROOM start` to the line
`READ_THE_ROOM end`, both included. It is section 14, just above the `END`
banner. The file's "WHAT IS IN HERE" index never listed it, so there is
nothing to remove there.

## 4. Delete this file

```bash
rm docs/read-the-room-removal.md
```

## 5. Check

```bash
npm test && npm run lint && npm run build
```

Then `grep -rn READ_THE_ROOM --exclude-dir=node_modules --exclude-dir=dist --exclude-dir=.git .`
should print nothing.

## What stays, on purpose

- **The count-free copy** in `index.html` and `vite.config.ts` ("Pass-the-phone
  party games. No wifi, no accounts, no setup."). It replaced two copies that
  already disagreed ("Eleven" and "Ten"), and it is correct with or without
  this mode.
- **`lastcall.readTheRoom.intro`** in players' localStorage. It is the
  "seen the how-to-play card" flag. It is harmless and nothing reads it once
  the mode is gone.
