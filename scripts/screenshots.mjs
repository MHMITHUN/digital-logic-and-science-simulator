// Capture the documentation screenshots referenced by README.md.
// Usage: start the dev server (npm run dev, port 3001), then run
//   node scripts/screenshots.mjs
//
// Produces two sets (same pages, both naming schemes live in different docs):
//   01-home / 02-main-feature / 03-boolean / 04-mobile / 05-classroom  (chunk brief)
//   01-home / 02-logic-lab / 03-number-system / 04-boolean-kmap /
//   05-physics / 06-classroom                                          (README table)
// plus 03-boolean-simplify as the companion shot of the Boolean lab's
// simplify tab (the lab's tabs hide each other, so one file cannot show
// both the truth table and the steps).
import { chromium } from "@playwright/test";
import { mkdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const OUT_DIR = path.join(ROOT, "docs", "screenshots");
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";

/** Save a screenshot and refuse to continue if the file looks empty. */
async function shoot(page, name, { fullPage = true } = {}) {
  const file = path.join(OUT_DIR, name);
  await page.screenshot({ path: file, fullPage });
  const kb = statSync(file).size / 1024;
  if (kb < 20) {
    throw new Error(`${name} is only ${kb.toFixed(1)} KB - the page probably failed to render`);
  }
  console.log(`captured ${name} (${kb.toFixed(0)} KB)`);
}

/** Click the K-map cell for a minterm number (cells end their label with it). */
async function clickMinterm(page, n) {
  await page.getByRole("button", { name: new RegExp(`minterm ${n}$`) }).click();
}

mkdirSync(OUT_DIR, { recursive: true });

const browser = await chromium.launch();

try {
  // 01 - landing page (desktop, 1280x800).
  const desktop = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await desktop.newPage();
  await page.goto(`${BASE_URL}/`, { waitUntil: "load" });
  await page.getByRole("heading", { level: 1 }).waitFor();
  await shoot(page, "01-home.png");

  // 02 - main feature: Logic Lab, AND gate, A=1 B=1, equation + truth table.
  await page.goto(`${BASE_URL}/logic`, { waitUntil: "load" });
  const inputB = page.getByRole("switch", { name: "Input B" });
  await inputB.click();
  // README variant of the same page: grab it while the signal is still
  // mid-propagation (the propagation delay is ~260 ms), settled shot after.
  await shoot(page, "02-logic-lab.png", { fullPage: false });
  await page.getByText(/1 \. 1 = 1/).waitFor();
  await page.locator("tr[aria-current='true']").filter({ hasText: "111" }).waitFor();
  await shoot(page, "02-main-feature.png");

  // 03 - number system lab: 25 -> binary with the division ladder (README).
  await page.goto(`${BASE_URL}/number-system`, { waitUntil: "load" });
  await page.getByRole("textbox", { name: "Value to convert" }).fill("25");
  await page.getByRole("combobox", { name: "From base" }).selectOption("decimal");
  await page.getByRole("combobox", { name: "To base" }).selectOption("binary");
  await page.getByText("Read the remainders from bottom to top (upward): 11001.").waitFor();
  await shoot(page, "03-number-system.png");

  // 03 - Boolean lab. Tabs hide each other, so the truth table and the
  // simplify steps are two captures: the brief's 03-boolean.png shows the
  // truth table of the default expression, the companion shot shows the
  // simplify walkthrough of the same lab.
  await page.goto(`${BASE_URL}/boolean`, { waitUntil: "load" });
  await page.getByRole("textbox", { name: "Boolean expression" }).fill("A.B + !A.C");
  await page.getByText("4 of 8 rows output 1").waitFor();
  await shoot(page, "03-boolean.png");

  await page.getByRole("tab", { name: "Simplify" }).click();
  await page.getByRole("textbox", { name: "Expression to simplify" }).fill("!(A.B).1 + B.0");
  await page.getByText("Equivalent to the original — verified row by row").waitFor();
  await shoot(page, "03-boolean-simplify.png");

  // 04 - Boolean lab, K-map tab with two accepted groups (README). The
  // default expression A'.B + A.B'.C has 1-cells at minterms 2, 3, 5;
  // groups {2,3} and {5} cover them all.
  await page.getByRole("tab", { name: "K-map Exercise" }).click();
  await page.getByRole("button", { name: "New puzzle" }).waitFor();
  await clickMinterm(page, 2);
  await clickMinterm(page, 3);
  await page.getByText(/· 1 group/).waitFor();
  await clickMinterm(page, 5);
  await clickMinterm(page, 5);
  await page.getByText(/· 2 groups/).waitFor();
  await shoot(page, "04-boolean-kmap.png");

  // 05 - physics lab: Ohm solver 12 V / 4 ohm -> 3 A (README).
  await page.goto(`${BASE_URL}/physics`, { waitUntil: "load" });
  await page.getByRole("spinbutton", { name: "Value of Voltage" }).fill("12");
  await page.getByRole("spinbutton", { name: "Value of Resistance" }).fill("4");
  await page.getByText("I = 12 V ÷ 4 Ω = 3 A").waitFor();
  await shoot(page, "05-physics.png");
  await desktop.close();

  // 04 - mobile landing page (390x844, iPhone-ish).
  const mobileCtx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const mobile = await mobileCtx.newPage();
  await mobile.goto(`${BASE_URL}/`, { waitUntil: "load" });
  await mobile.getByRole("heading", { level: 1 }).waitFor();
  await shoot(mobile, "04-mobile.png");
  await mobileCtx.close();

  // 05/06 - classroom mode: the projector view with an experiment live.
  const classroomCtx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const classroom = await classroomCtx.newPage();
  // Fullscreen if the headless browser allows it; the view itself is the
  // same either way (URL ?e=<id>&step=N is the whole state).
  await classroom.goto(`${BASE_URL}/classroom?e=and-gate&step=2`, { waitUntil: "load" });
  await classroom.getByRole("heading", { level: 1 }).waitFor();
  await classroom.evaluate(() =>
    document.documentElement.requestFullscreen().catch(() => {}),
  );
  await classroom.waitForTimeout(300);
  await shoot(classroom, "05-classroom.png", { fullPage: false });

  await classroom.goto(`${BASE_URL}/classroom?e=decimal-binary&step=3`, { waitUntil: "load" });
  await classroom.getByRole("heading", { level: 1 }).waitFor();
  await shoot(classroom, "06-classroom.png", { fullPage: false });
  await classroomCtx.close();

  console.log("all screenshots captured");
} finally {
  await browser.close();
}
