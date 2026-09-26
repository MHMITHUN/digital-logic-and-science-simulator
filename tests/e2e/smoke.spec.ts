import { test, expect, type Page } from "@playwright/test";

/**
 * End-to-end smoke flows, one per module (spec: every computation must come
 * from the real engines — these tests assert the computed values, not just
 * that pages render). Every test also fails if the browser logs a single
 * console error or uncaught page error at any point in the flow.
 *
 * Chunk note: the Boolean lab renders all four tab panels in the DOM and
 * hides the inactive ones with the hidden attribute — Playwright's role
 * queries skip hidden elements, so selectors stay scoped to the active tab.
 */

/** Collect uncaught errors + console.error output for the whole test. */
function collectBrowserErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });
  return errors;
}

test("home: hero and all module cards are visible", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/");

  await expect(
    page.getByRole("heading", { level: 1, name: "Stop memorizing diagrams. Flip the switches." }),
  ).toBeVisible();

  // The five lab cards + the classroom highlight.
  for (const card of [
    "Logic Lab",
    "Circuit Builder",
    "Number Systems",
    "Boolean and K-map",
    "Physics Circuits",
    "Classroom Mode",
  ]) {
    await expect(page.getByRole("heading", { level: 3, name: card })).toBeVisible();
  }

  await expect(page.getByRole("link", { name: "Open the Logic Lab" })).toBeVisible();
  expect(errors, "Browser errors were logged during the flow").toEqual([]);
});

test("logic: toggling input B changes output, equation, and highlighted row", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/logic");

  // Defaults: AND gate, A=1, B=0 -> Y=0, truth table row 1,0,0 highlighted.
  // (The current row carries aria-current="true"; getByRole in this
  // Playwright version has no `current` role option, so locate directly.)
  const highlightedRow = page.locator("tr[aria-current='true']");
  const inputB = page.getByRole("switch", { name: "Input B" });
  await expect(inputB).toHaveAttribute("aria-checked", "false");
  await expect(highlightedRow).toHaveText("100");
  // The equation readout reads "Y = A . B → Y = 1 . 0 = 0" (spaces around
  // the AND dot come from booleanExpr in the engine).
  await expect(page.getByText(/1 \. 0 = 0/)).toBeVisible();

  await inputB.click();

  // After the signal propagates: A=1, B=1 -> Y=1, row 1,1,1 highlighted.
  await expect(inputB).toHaveAttribute("aria-checked", "true");
  await expect(highlightedRow).toHaveText("111");
  await expect(page.getByText(/1 \. 1 = 1/)).toBeVisible();

  expect(errors, "Browser errors were logged during the flow").toEqual([]);
});

test("number-system: decimal 25 converts to binary 11001 with steps", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/number-system");

  await page.getByRole("textbox", { name: "Value to convert" }).fill("25");
  await page.getByRole("combobox", { name: "From base" }).selectOption("decimal");
  await page.getByRole("combobox", { name: "To base" }).selectOption("binary");

  // The big result inside the live region reads 11001.
  const resultBox = page.getByText("Decimal → Binary", { exact: true }).locator("..");
  await expect(resultBox.getByText("11001", { exact: true })).toBeVisible();

  // The division-remainder working is shown, first and last step.
  await expect(
    page.getByText("Division-remainder method — divide, keep the remainders"),
  ).toBeVisible();
  await expect(page.getByText("25 ÷ 2 = 12 remainder 1")).toBeVisible();
  await expect(page.getByText("Read the remainders from bottom to top (upward): 11001.")).toBeVisible();

  expect(errors, "Browser errors were logged during the flow").toEqual([]);
});

test("boolean: A AND NOT A gives an all-zero truth table and simplifies to 0", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/boolean");

  // Tab 1 (default): truth table of the contradiction (one variable, two rows).
  await page.getByRole("textbox", { name: "Boolean expression" }).fill("A AND NOT A");
  await expect(page.getByText("0 of 2 rows output 1")).toBeVisible();
  await expect(page.getByText("Y = 0", { exact: true })).toBeVisible();

  // Tab 2: the simplifier demonstrates the complement law down to 0.
  await page.getByRole("tab", { name: "Simplify" }).click();
  await page.getByRole("textbox", { name: "Expression to simplify" }).fill("A AND NOT A");
  await expect(page.getByText("Step 1 — Complement (X.!X = 0)")).toBeVisible();
  const finalExpression = page
    .getByText("Simplest form the demo reaches")
    .locator("xpath=following-sibling::p");
  await expect(finalExpression).toHaveText("0");
  // The honesty check: simplified result verified against the original.
  await expect(
    page.getByText("Equivalent to the original — verified row by row"),
  ).toBeVisible();

  expect(errors, "Browser errors were logged during the flow").toEqual([]);
});

test("physics: V=12 and R=4 solve to I=3 A with substitution", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/physics");

  // Tab 1 (default): Ohm's law, solving for current.
  await page.getByRole("spinbutton", { name: "Value of Voltage" }).fill("12");
  await page.getByRole("spinbutton", { name: "Value of Resistance" }).fill("4");

  await expect(page.getByText("3 A", { exact: true })).toBeVisible();
  await expect(page.getByText("I = 12 V ÷ 4 Ω = 3 A")).toBeVisible();

  expect(errors, "Browser errors were logged during the flow").toEqual([]);
});

test("journal: adding an entry shows it in the list", async ({ page }) => {
  const errors = collectBrowserErrors(page);
  await page.goto("/journal");

  await page.getByRole("textbox", { name: "Experiment name" }).fill("AND gate with A=1, B=1");
  // exact: the page also has a "Filter by module" combobox, and role name
  // matching is substring-based by default.
  await page.getByRole("combobox", { name: "Module", exact: true }).selectOption("logic");
  await page.getByRole("textbox", { name: "Inputs used" }).fill("A=1, B=1");
  await page.getByRole("textbox", { name: "My prediction" }).fill("Output will be 1");
  await page.getByRole("textbox", { name: "Actual result" }).fill("Y=1");
  await page.getByRole("button", { name: "Save entry" }).click();

  await expect(page.getByRole("status").filter({ hasText: "Entry saved" })).toBeVisible();
  await expect(
    page.getByRole("heading", { level: 2, name: "AND gate with A=1, B=1" }),
  ).toBeVisible();
  await expect(page.getByText("Y=1")).toBeVisible();

  expect(errors, "Browser errors were logged during the flow").toEqual([]);
});
