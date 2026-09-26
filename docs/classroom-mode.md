# Classroom Mode — teacher walkthrough

`/classroom` is the projector-first view of the simulator (spec §16.8): the
site header and footer disappear, one experiment fills the screen, every
control is enlarged, and the learning objective stays on screen the whole
time. The same engines power it as the student labs — nothing is
pre-recorded.

**The URL is the whole state:** `/classroom?e=<experiment-id>&step=N`.
Book it before class and you land on the exact moment you want.

---

## Starting up (2 minutes before class)

1. Open `/classroom` — you get the menu of all eight experiments with their
   objectives.
2. Press **F** (or the Fullscreen button, top right) — F toggles it back
   out too; it never fires while you are typing in a field.
3. Click **Start** on the experiment you want, or paste a deep link you
   prepared earlier.

The top bar always shows: experiment number (e.g. "Experiment 4 of 8"),
module badge, title, the **objective**, the step counter ("Step 2 / 5"),
Fullscreen, and **All experiments** to return to the menu.

The bottom bar shows the current guided prompt with big **Back** /
**Next step** buttons. On wide screens it also names the previous and next
experiments — jump directly with those. The bar sits in the page flow, so
it can never cover the stage.

---

## The eight curated experiments

| # | Deep link | What the class sees | Steps |
| --- | --- | --- | --- |
| 1 | `?e=and-gate` | AND as two switches in series; reveal the truth table row by row | 4 |
| 2 | `?e=xor-gate` | XOR the difference detector; ends at the half-adder SUM bit | 4 |
| 3 | `?e=de-morgan` | `!(A.B)` vs `!A + !B` — proof by table, one row per step | 5 |
| 4 | `?e=decimal-binary` | 25 → 11001 by repeated division; working reveals one row per step | 5 |
| 5 | `?e=binary-hex` | 11010110 → D6 by 4-bit grouping | 4 |
| 6 | `?e=ohms-law` | Ohm's law live at presentation size (solve for V) | 4 |
| 7 | `?e=series-drops` | 12 V across 10 Ω + 20 Ω in series; drops add back to the source | 4 |
| 8 | `?e=kmap-3var` | 3-variable K-map `B + A.C`; the minimal groups appear as you step | 4 |

### How steps drive the stage

- **Gate experiments** (1, 2): a giant switch bench — toggle A and B in
  front of the class while you advance the prompts.
- **Number conversion** (4, 5): the working stays hidden and **one division
  row / one bit group appears per step** — press Next step only when the
  class has predicted the row. (At the last step the full working is on
  screen.)
- **De Morgan** (3): the comparison table reveals **one row per step**;
  each prompt reads the row aloud. Step 5 is the conclusion sentence.
- **Ohm / series-parallel** (6, 7): the same solver components as the
  physics lab at `size="lg"` — slide values live; the prompts tell you what
  to set (experiment 7 opens preloaded with 12 V, 10 Ω, 20 Ω).
- **K-map** (8): the minimal groups appear one per step
  (`revealGroups = step − 1`), so the map starts clean and the cover builds
  itself as you talk.

---

## A worked example: the 25 → 11001 lesson

Target link: `/classroom?e=decimal-binary`.

1. **Step 1** — first division row appears: `25 ÷ 2 = 12 remainder 1`.
   Ask: "Why must the remainder be 0 or 1?" before pressing Next step.
2. **Steps 2–5** — each press adds one row (12, 6, 3, 1) and the prompt
   narrates it. The fifth step reads the remainders **upward**: 11001.
3. Ask the class to verify by expansion — then open `/number-system` and
   let a student type 11001 → decimal and meet 25 again.
4. Press **Next experiment** to roll straight into binary → hex grouping.

## Classroom management notes

- **Esc / F** — F toggles fullscreen; there is no mode to "lose" — the URL
  always restorable.
- Wrong step? **Back** reverses within an experiment; the previous/next
  experiment buttons (wide screens) hop between experiments.
- Everything is client-side: if the venue Wi-Fi dies after load, the lesson
  continues.
- Students revisiting your deep link on their phones get the same view at
  phone width — the bottom bar reflows under the stage.

---

## Preparing your own deep links

Any experiment at any step: take the id from the table above and add the
step number, e.g. `/classroom?e=kmap-3var&step=3` opens the K-map with two
groups already revealed. Step numbers beyond the end are clamped to the
last step; a missing or invalid `e` falls back to the menu. Invalid steps
default to 1 — the link never crashes a lesson.

The curated list lives in `src/lib/classroom-experiments.ts` (pure data +
`validateRegistry()` self-check used by the unit tests). Adding a ninth
experiment is a data edit: id, title, objective, module label, route, steps,
and the stage payload.
