# Modules Guide — teaching with each lab

Per module: learning objectives, a suggested script for a 40-minute class
period, and the common misconceptions the module is built to break. Routes
are relative to the deployed site. Bangladesh SSC/HSC ICT context throughout
(Chapter 3 — Number Systems and Digital Devices and related physics).

Every value the modules show is computed live by the engines in
`src/engines/` — nothing is pre-recorded (spec §36 honesty rule). That
matters in class: if a student asks "what if we…", you can just do it.

---

## 1. Logic Gate Playground — `/logic`

**What it is.** One gate at a time on an experiment bench: choose any of the
seven syllabus gates (AND, OR, NOT, NAND, NOR, XOR, XNOR), toggle inputs A
and B with big switches, watch the signal travel (a short, honest
propagation delay — reduced-motion skips it), and read the live Boolean
equation `A.B → 1.0 = 0`. The current input combination is highlighted in
the gate's truth table, and each gate carries its 74-series IC number
(7408, 7432, 7404, 7400, 7402, 7486, 74266).

### Learning objectives

- State the rule of each of the seven gates in words, not symbols.
- Read and complete a gate's truth table from memory.
- Connect the gate symbol to its Boolean expression and its IC number.
- Predict the output for any input combination before toggling.

### Suggested 40-minute script

| Time | Activity |
| --- | --- |
| 0–5 | Start with AND. Cover the Y column with your hand (the built-in teacher tip); the class predicts each row aloud; then toggle to check. |
| 5–12 | Repeat for OR and NOT. Anchor the analogies: AND = two switches in series, OR = two switches in parallel, NOT = a seesaw. |
| 12–20 | NAND and NOR: build them from what students know (AND/OR + inverter bubble). Mention "universal gate" — any circuit can be built from NAND alone. |
| 20–28 | XOR and XNOR as difference/equality detectors. Ask: which of these would compare two bits for a binary adder? (XOR — the SUM bit.) |
| 28–35 | Switch between gates quickly and fire prediction questions at random rows; the highlight follows the live inputs. |
| 35–40 | Students open `/journal`, record one gate experiment: prediction vs. actual for a row they got wrong. |

### Misconceptions addressed

- *"AND outputs 1 if A is 1."* — No: both inputs. Toggling B alone while A
  stays 1 shows the output stuck at 0.
- *"NAND is another word for NOT."* — The bubble inverts the **AND result**;
  only the row A=1, B=1 makes NAND 0.
- *"XOR means OR."* — Both inputs ON gives 0: XOR means *exactly one*.
- *"The truth table is decoration."* — The highlighted row moves with the
  live switches, so the table is the experiment's record.

---

## 2. Circuit Builder — `/logic/builder`

**What it is.** A combinational circuit editor: add inputs (A, B, C…) and
gates, wire any output into any gate input, remove nodes (dangling wires are
cleaned up), validate, reset. Cycles are detected and rejected — this is a
combinational-only lab by design. With ≤ 3 inputs the builder produces the
whole circuit's truth table. Four preset circuits load in one click:
`A AND B`, `(A OR B) AND C`, `A XOR B`, `NOT (A AND B)`.

### Learning objectives

- Translate an expression like `(A + B) . C` into a gate diagram and back.
- Build and read multi-gate circuits without breadboard logistics.
- Understand why output-to-input wiring must never form a loop here.
- Verify a built circuit against its truth table.

### Suggested 40-minute script

| Time | Activity |
| --- | --- |
| 0–5 | Load the `A AND B` preset; show that it behaves exactly like yesterday's single gate — a circuit is just gates composed. |
| 5–15 | Build `NOT (A AND B)` from scratch: AND first, then NOT on top. Ask: which single gate does this equal? (NAND — the preset makes the check instant.) |
| 15–25 | Build `(A OR B) AND C` together. Emphasize order of operations made physical: the OR must finish before the AND can answer. |
| 25–33 | Try to wire an output back into its own input — show the cycle rejection. One sentence on why real memory (latches) needs more machinery than this lab. |
| 33–40 | Predict-then-check the truth table of the finished circuit, row by row. |

### Misconceptions addressed

- *"Wires can go anywhere."* — Inputs are typed; outputs drive inputs; a
  wire into nothing or a loop is caught and explained, not silently allowed.
- *"A big circuit's truth table is a new kind of object."* — It is the same
  2^n rows; only the Y column changes.
- *"Order doesn't matter inside the expression."* — Building the OR gate
  *before* the AND gate is the physical version of parentheses.

---

## 3. Number System Lab — `/number-system`

**What it is.** Convert between decimal, binary, octal, and hexadecimal and
see the **method**, chosen honestly by the pair of bases:

- decimal → other: **division-remainder** ladder (`25 ÷ 2 = 12 remainder 1…`)
- other → decimal: **positional expansion** (`1 × 2^4 = 16…`)
- binary ↔ octal/hex: **3-bit / 4-bit grouping** shortcut (with padding note)
- octal ↔ hex: via decimal, with both halves of the working shown

Invalid digits, signs, fractions, > 16 digits, and values above 2^53 − 1
are rejected with teaching-voice messages. A 0–16 reference table sits
beside the working.

### Learning objectives

- Execute repeated division by the target base and read remainders upward.
- Expand any number positionally to prove its decimal value.
- Convert binary ↔ octal/hex by grouping bits, and know when that shortcut
  is legal.
- Recognize valid digits per base before converting anything.

### Suggested 40-minute script

| Time | Activity |
|---|---|
| 0–5 | Why bases? Count in binary on fingers up to 31; let the class lead. |
| 5–15 | Convert 25 to binary together: type 25, decimal → binary, and walk the division ladder one row at a time. Read upward: 11001. |
| 15–23 | Reverse it: binary 11001 → decimal via the positional steps; the two answers must meet at 25. |
| 23–32 | The shortcut: 11010110 → hex by 4-bit grouping (1101 = D, 0110 = 6 → D6). Then octal with 3-bit groups. Ask why octal uses 3 bits (2^3 = 8). |
| 32–38 | Error clinic: type 2F as decimal, 129 as binary — read the messages the lab gives. Students self-correct digits per base. |
| 38–40 | Journal: record one conversion with the prediction written before the steps were shown. |

### Misconceptions addressed

- *"The remainders are read top to bottom."* — The engine's note says it and
  the highlighted result row makes the upward reading visible.
- *"Hex digits past 9 are new numbers."* — They are values 10–15 with single
  symbols; the reference table shows all four bases side by side.
- *"You convert binary to hex digit-by-digit in order."* — Grouping is from
  the **right**, with left padding; the grouping note says so each time.
- *"Any letter works in hex."* — G is rejected with a message naming the
  valid digit set.

---

## 4. Boolean Algebra Lab — `/boolean`

**What it is.** Four tabs over one expression box:

1. **Truth Table** — variables detected, full table, canonical
   sum-of-products from the minterms.
2. **Simplify** — a step-by-step demonstration of a **documented subset** of
   identities (double negation, identity, domination, idempotent, complement,
   De Morgan), one rule per card, applied until a fixpoint. It is *not* an
   industrial theorem prover, it says so, and the UI verifies each result
   against the original truth table, row by row.
3. **De Morgan** — a dedicated walkthrough that pushes NOTs inward using only
   De Morgan's laws + double negation, comparing both sides' truth tables.
4. **K-map Exercise** — a real Gray-coded map (2–4 variables) from your own
   expression or a random puzzle; students draw rectangles (mouse or arrow
   keys + Enter; edges wrap), every selection is validated (powers of two,
   wraparound, no zero cells, no holes), each accepted group is labelled with
   its product term, and a complete cover is checked against the engine's own
   minimal cover.

### Learning objectives

- Write and parse Boolean expressions with correct precedence
  (NOT > AND > XOR > OR).
- Build a truth table and the canonical SOP from its minterms.
- Apply the named identity laws one step at a time — and know which moves
  are *outside* the subset (absorption, consensus…).
- State and prove both De Morgan's laws by table.
- Solve a K-map: group 1s into the biggest power-of-two rectangles, read
  the minimal SOP, and verify against the engine's minimal cover.

### Suggested 40-minute script

| Time | Activity |
| --- | --- |
| 0–8 | Truth table tab: type `A.B + !A.C`, watch minterms appear; SOP is "one product term per 1-row". Deliberately typo `A..B` and read the parse error. |
| 8–18 | Simplify tab: enter `!(A.B).1 + B.0` — De Morgan, then identity, then domination, one visible rule per card. Then `!!A + A + A'`. Close with `A AND NOT A` → 0 to show the complement law and the equivalence badge. |
| 18–26 | De Morgan tab: `!(A.B)` vs `!A + !B` — reveal rows one at a time; all four rows match, so the two expressions are one function. Break the bar, change the sign. |
| 26–38 | K-map exercise: 3-variable random puzzle. Students group; wraparound groups and zero-cell groups get teaching feedback. Compare the class cover to the engine's minimal one. |
| 38–40 | Journal: which law surprised you, with a row from the table as evidence. |

### Misconceptions addressed

- *"Simplifiers know every trick."* — The lab names its subset, refuses
  out-of-scope expressions politely, and the badge proves each answer equals
  the original. Honest tools beat magic tools.
- *"De Morgan changes the sign of the variables."* — It breaks the bar AND
  swaps AND↔OR; the side-by-side table shows the result is the same function.
- *"Any rectangle of 1s is a group."* — Only powers of two, no holes, no
  zero cells; every rejected selection gets a reason naming the broken rule.
- *"K-map edges are dead space."* — The map wraps; corner and edge-pair
  groups are accepted and the feedback celebrates them.

---

## 5. Physics Circuits Lab — `/physics`

**What it is.** Two tabs:

1. **Ohm's Law** — pick the quantity to solve for; slide or type the two
   known values; get the solved quantity, the formula, and the numeric
   substitution (`I = 12 V ÷ 4 Ω = 3 A`), plus power
   (P = V×I / I²×R / V²÷R) and warnings when current > 10 A or power > 100 W.
2. **Series and Parallel** — set the source and 2–5 resistor values;
   equivalent resistance (with the reciprocal-math substitution), total
   current, per-resistor voltage and power as drop bars, KCL/KVL-style
   checks, and reset. A 0 Ω parallel branch is rejected as the short circuit
   it is.

### Learning objectives

- Solve V = I × R for any of the three quantities and show the substitution.
- Predict how I changes when V or R moves (direction, not just number).
- Compute series/parallel equivalent resistance and explain *why* the
  formulas differ.
- Explain voltage dividing by resistance in series and current dividing by
  resistance in parallel; sanity-check with KVL/KCL.
- Recognize dangerous/extreme values instead of computing them blindly.

### Suggested 40-minute script

| Time | Activity |
| --- | --- |
| 0–8 | Ohm tab, solve for I: V=12, R=4 → 3 A. Then slide R up and ask the class to vote: does I rise or fall? Push V next. |
| 8–16 | Solve for V, then for R — same triangle, different unknown; the substitution line always shows the arithmetic. |
| 16–20 | Type extreme values and meet the warnings; discuss why 10 A is a lot in a classroom. |
| 20–32 | Series bench: 12 V, R1=10 Ω, R2=20 Ω → R=30 Ω, I=0.4 A, V1=4 V, V2=8 V. Watch the drops add back to 12 V. |
| 32–38 | Same resistors in parallel: R = 5 Ω — *less than the smallest branch*. Ask why before revealing. |
| 38–40 | Journal: one Ohm prediction and what the substitution actually showed. |

### Misconceptions addressed

- *"R = 0 is fine, the answer is just big."* — Solving I with R=0 is
  rejected as division by zero / short circuit, not computed as infinity.
- *"Parallel resistance adds up."* — It is always below the smallest branch;
  the substitution shows the reciprocal math producing that.
- *"The biggest resistor gets the least voltage in series."* — Opposite:
  drops divide *in proportion* to R; the bars make the 1:2 split visible.
- *"Power is just V×I in every form."* — The bench shows the formula it
  actually used (P = I²×R when V is the unknown being solved, etc.).

---

## The Experiment Journal — `/journal` (cross-module)

The journal is the pedagogy engine: **prediction, inputs, actual result,
observation, conclusion** — all but observation/conclusion required, so a
blank prediction cannot be submitted. Entries stay in that browser
(localStorage), filter by module, export as RFC 4180 CSV (BOM-prefixed for
Excel). Two open tabs stay in sync.

**Use it as:** homework evidence (submit the CSV), a lab notebook during a
guided class, or a self-study trail of wrong predictions — the most
valuable rows in the file.

---

## Related docs

- [`classroom-mode.md`](classroom-mode.md) — projector walkthrough of the 8
  curated experiments.
- [`engine-reference.md`](engine-reference.md) — every formula, step format,
  and the Boolean operator table.
- [`../README.md`](../README.md) — architecture and the honesty rule.
