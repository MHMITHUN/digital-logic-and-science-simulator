"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Download, FlaskConical, NotebookPen, Trash2 } from "lucide-react";
import {
  JOURNAL_MODULE_IDS,
  JOURNAL_MODULE_LABELS,
  type JournalEntry,
  type JournalFormValues,
  type JournalModuleId,
  createEntry,
  journalCsv,
  journalFormSchema,
  sortEntriesNewestFirst,
} from "@/lib/journal";
import {
  getJournalServerSnapshot,
  getJournalSnapshot,
  subscribeJournal,
  writeJournal,
} from "@/lib/journal-store";
import { formatDate } from "@/lib/utils";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  EmptyState,
  Field,
  Input,
  Select,
  Textarea,
} from "@/components/ui";

const EMPTY_FORM: JournalFormValues = {
  experiment: "",
  module: "logic",
  inputs: "",
  prediction: "",
  result: "",
  observation: "",
  conclusion: "",
};

/**
 * Experiment Journal (spec §16.9): predict → observe → record. Entries live
 * in this browser's localStorage only — there is no server, and the UI says
 * so plainly.
 */
export function JournalApp() {
  // The journal IS the localStorage store — reads and writes go through it
  // (useSyncExternalStore keeps every view and tab consistent).
  const entries = useSyncExternalStore(
    subscribeJournal,
    getJournalSnapshot,
    getJournalServerSnapshot,
  );
  const [form, setForm] = useState<JournalFormValues>(EMPTY_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof JournalFormValues, string>>>({});
  const [savedMessage, setSavedMessage] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const [filter, setFilter] = useState<"all" | JournalModuleId>("all");
  const [clearOpen, setClearOpen] = useState(false);

  const commit = (next: JournalEntry[]) => {
    setStorageWarning(!writeJournal(next));
    setSavedMessage(null);
  };

  const filtered = useMemo(() => {
    const visible = filter === "all" ? entries : entries.filter((entry) => entry.module === filter);
    return sortEntriesNewestFirst(visible);
  }, [entries, filter]);

  const update = (patch: Partial<JournalFormValues>) => {
    setForm((current) => ({ ...current, ...patch }));
    setSavedMessage(null);
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const parsed = journalFormSchema.safeParse(form);
    if (!parsed.success) {
      const next: Partial<Record<keyof JournalFormValues, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof JournalFormValues | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    commit([...entries, createEntry(parsed.data)]);
    // Keep the module sticky for a run of experiments; clear the rest.
    setForm({ ...EMPTY_FORM, module: form.module });
    setSavedMessage("Entry saved. Predict, try, record — that is the whole method.");
  };

  const deleteEntry = (id: string) => {
    commit(entries.filter((entry) => entry.id !== id));
  };

  const exportCsv = () => {
    const csv = journalCsv(sortEntriesNewestFirst(entries));
    // UTF-8 BOM so Excel opens the characters correctly.
    const blob = new Blob([`﻿${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `experiment-journal-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <span className="inline-flex w-fit items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
          <NotebookPen className="size-3.5" aria-hidden="true" />
          The journal turns play into learning
        </span>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Experiment Journal
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Before each experiment, write what you <em>predict</em>. Then run it,
          record what actually happened, and finish with your own conclusion —
          the habit every science course builds on.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Add form */}
        <Card>
          <CardHeader>
            <CardTitle>Record an experiment</CardTitle>
            <p className="text-xs text-muted">
              All fields except observation and conclusion are required.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
              <Field label="Experiment name" name="journal-experiment" error={errors.experiment}>
                {(ids) => (
                  <Input
                    id={ids.id}
                    placeholder="e.g. AND gate with A=1, B=1"
                    aria-describedby={ids["aria-describedby"]}
                    aria-invalid={ids["aria-invalid"]}
                    value={form.experiment}
                    onChange={(event) => update({ experiment: event.target.value })}
                  />
                )}
              </Field>

              <Field label="Module" name="journal-module" error={errors.module}>
                {(ids) => (
                  <Select
                    id={ids.id}
                    value={form.module}
                    onChange={(event) => update({ module: event.target.value as JournalModuleId })}
                  >
                    {JOURNAL_MODULE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {JOURNAL_MODULE_LABELS[id]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>

              <Field label="Inputs used" name="journal-inputs" error={errors.inputs}>
                {(ids) => (
                  <Input
                    id={ids.id}
                    placeholder="e.g. A=1, B=0 — or 12 V across 10 Ω"
                    aria-describedby={ids["aria-describedby"]}
                    aria-invalid={ids["aria-invalid"]}
                    value={form.inputs}
                    onChange={(event) => update({ inputs: event.target.value })}
                  />
                )}
              </Field>

              <Field
                label="My prediction"
                name="journal-prediction"
                error={errors.prediction}
                hint="Write it before you look — a wrong prediction teaches more than a right one."
              >
                {(ids) => (
                  <Textarea
                    id={ids.id}
                    rows={2}
                    placeholder="I think the output will be…"
                    aria-describedby={ids["aria-describedby"]}
                    aria-invalid={ids["aria-invalid"]}
                    value={form.prediction}
                    onChange={(event) => update({ prediction: event.target.value })}
                  />
                )}
              </Field>

              <Field label="Actual result" name="journal-result" error={errors.result}>
                {(ids) => (
                  <Input
                    id={ids.id}
                    placeholder="What the simulator actually showed"
                    aria-describedby={ids["aria-describedby"]}
                    aria-invalid={ids["aria-invalid"]}
                    value={form.result}
                    onChange={(event) => update({ result: event.target.value })}
                  />
                )}
              </Field>

              <Field label="Observation (optional)" name="journal-observation">
                {(ids) => (
                  <Textarea
                    id={ids.id}
                    rows={2}
                    placeholder="Patterns you noticed while experimenting"
                    aria-describedby={ids["aria-describedby"]}
                    value={form.observation}
                    onChange={(event) => update({ observation: event.target.value })}
                  />
                )}
              </Field>

              <Field label="Conclusion (optional)" name="journal-conclusion">
                {(ids) => (
                  <Textarea
                    id={ids.id}
                    rows={2}
                    placeholder="What you now believe, and why"
                    aria-describedby={ids["aria-describedby"]}
                    value={form.conclusion}
                    onChange={(event) => update({ conclusion: event.target.value })}
                  />
                )}
              </Field>

              <Button type="submit" className="self-start">
                Save entry
              </Button>

              {savedMessage && (
                <p role="status" className="text-sm font-medium text-success">
                  {savedMessage}
                </p>
              )}
            </form>
          </CardContent>
        </Card>

        {/* List */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="w-56">
              <Field label="Filter by module" name="journal-filter" hideLabel>
                {(ids) => (
                  <Select
                    id={ids.id}
                    value={filter}
                    onChange={(event) => setFilter(event.target.value as typeof filter)}
                  >
                    <option value="all">All modules</option>
                    {JOURNAL_MODULE_IDS.map((id) => (
                      <option key={id} value={id}>
                        {JOURNAL_MODULE_LABELS[id]}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={exportCsv} disabled={entries.length === 0}>
                <Download className="size-4" aria-hidden="true" />
                Export CSV
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => setClearOpen(true)}
                disabled={entries.length === 0}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Clear all
              </Button>
            </div>
          </div>

          {storageWarning && (
            <Alert tone="warning" title="This browser is blocking local storage">
              Your entries could not be saved — they will disappear when you
              leave this page. Allow site data or copy them out with Export CSV.
            </Alert>
          )}

          <Alert tone="info" title="Where your data lives">
            This journal is stored in this browser only (localStorage). Clearing
            browser data for this site removes it — export a CSV before you
            clear anything.
          </Alert>

          {entries.length === 0 ? (
            <EmptyState
              icon={FlaskConical}
              title="No experiments recorded yet — try the Logic Lab and record what you predict vs what happens"
              description="Every module above has something worth predicting. The journal is the proof you experimented."
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              title="Nothing in this module yet"
              description="Switch the filter back to All modules to see your other experiments."
            />
          ) : (
            <ul className="flex flex-col gap-4">
              {filtered.map((entry) => (
                <li key={entry.id}>
                  <Card>
                    <CardContent className="flex flex-col gap-3 p-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base font-semibold text-fg">{entry.experiment}</h2>
                          <p className="mt-0.5 text-xs text-muted">
                            {formatDate(entry.createdAt)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge tone="accent">{JOURNAL_MODULE_LABELS[entry.module]}</Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteEntry(entry.id)}
                            aria-label={`Delete experiment: ${entry.experiment}`}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                      <dl className="grid gap-2 sm:grid-cols-2">
                        <JournalField label="Inputs used" value={entry.inputs} />
                        <JournalField label="My prediction" value={entry.prediction} />
                        <JournalField label="Actual result" value={entry.result} />
                        {entry.observation && (
                          <JournalField label="Observation" value={entry.observation} />
                        )}
                        {entry.conclusion && (
                          <JournalField label="Conclusion" value={entry.conclusion} />
                        )}
                      </dl>
                    </CardContent>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <Dialog open={clearOpen} onClose={() => setClearOpen(false)} title="Clear the whole journal?">
        <div className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-fg">
            This deletes all {entries.length} experiment{entries.length === 1 ? "" : "s"} from
            this browser. There is no undo — and no copy anywhere else. Export a
            CSV first if you might want them.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setClearOpen(false)}>
              Keep my entries
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                commit([]);
                setClearOpen(false);
              }}
            >
              Delete everything
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}

function JournalField({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-bg p-3">
      <dt className="text-xs font-medium uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed text-fg">{value}</dd>
    </div>
  );
}
