"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Hammer, Table2, Unplug } from "lucide-react";
import {
  CircuitError,
  PRESETS,
  addNode,
  emptyGraph,
  evaluate,
  presetGraph,
  removeNode,
  toTruthTable,
  unwire,
  wire,
  type CircuitGraph,
} from "@/engines/circuit";
import { GATE_KEYS, GATES, type Bit, type GateKey } from "@/engines/logic";
import { CircuitCanvas, layoutGraph } from "@/components/logic/CircuitCanvas";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Select,
  Table,
  TableBody,
  TableHead,
  TableRow,
  TD,
  TH,
} from "@/components/ui";
import { cn } from "@/lib/utils";

const MAX_INPUTS = 3;

interface Feedback {
  tone: "info" | "success" | "warning" | "danger";
  text: string;
}

export default function CircuitBuilderPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto max-w-6xl px-4 py-10 text-sm text-muted sm:px-6">
          Loading the circuit builder…
        </div>
      }
    >
      <BuilderWorkspace />
    </Suspense>
  );
}

/** Map a ?gate= param from the playground to a friendly starting circuit. */
function initialGraph(gateParam: string | null): CircuitGraph {
  if (gateParam === "XOR") return presetGraph("a-xor-b");
  if (gateParam === "NAND") return presetGraph("not-a-and-b");
  const customBlank =
    gateParam !== null &&
    gateParam !== "AND" &&
    gateParam !== "XOR" &&
    gateParam !== "NAND" &&
    gateParam in GATES;
  if (customBlank && gateParam) {
    // OR / NOR / NOT / XNOR: start with inputs and the chosen gate, unwired,
    // so the student's first job is to connect it.
    let graph = emptyGraph();
    graph = addNode(graph, { kind: "input" }).graph;
    graph = addNode(graph, { kind: "input" }).graph;
    graph = addNode(graph, { kind: "gate", gate: gateParam as GateKey }).graph;
    return graph;
  }
  return presetGraph("a-and-b");
}

/** True when the initial circuit starts unwired and deserves a hint. */
function startsUnwired(gateParam: string | null): boolean {
  return (
    gateParam !== null &&
    gateParam !== "AND" &&
    gateParam !== "XOR" &&
    gateParam !== "NAND" &&
    gateParam in GATES
  );
}

function BuilderWorkspace() {
  const searchParams = useSearchParams();
  const gateParam = searchParams.get("gate");

  const [graph, setGraph] = useState<CircuitGraph>(() => initialGraph(gateParam));
  const [inputValues, setInputValues] = useState<Record<string, Bit>>({});
  const [selectedSource, setSelectedSource] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(
    startsUnwired(gateParam)
      ? { tone: "info", text: "Wire inputs A and B into the gate: click an OUT button first, then an empty input slot." }
      : null,
  );
  const [validation, setValidation] = useState<Feedback | null>(null);

  const positions = useMemo(() => layoutGraph(graph), [graph]);
  const values = useMemo(() => {
    try {
      return evaluate(graph, inputValues).values;
    } catch {
      return {} as Record<string, Bit>;
    }
  }, [graph, inputValues]);

  const inputCount = graph.nodes.filter((node) => node.kind === "input").length;

  const truthTable = useMemo(() => {
    try {
      return { table: toTruthTable(graph), error: null as string | null };
    } catch (error) {
      const message =
        error instanceof CircuitError ? error.message : "Truth table unavailable.";
      return { table: null, error: message };
    }
  }, [graph]);

  /** Run a pure graph transform, catching engine errors into the feedback alert. */
  const applyGraph = (producer: (graph: CircuitGraph) => CircuitGraph) => {
    try {
      setGraph(producer(graph));
      return true;
    } catch (error) {
      if (error instanceof CircuitError) {
        setFeedback({ tone: "danger", text: error.message });
      }
      return false;
    }
  };

  const handleAddInput = () => {
    if (inputCount >= MAX_INPUTS) {
      setFeedback({ tone: "info", text: "This builder supports up to 3 inputs — enough for every SSC/HSC example." });
      return;
    }
    applyGraph((current) => addNode(current, { kind: "input" }).graph);
  };

  const handleAddGate = (gate: GateKey) => {
    const result = applyGraph((current) => addNode(current, { kind: "gate", gate }).graph);
    if (result) {
      setFeedback({ tone: "info", text: `Added a ${gate} gate. Click an OUT button, then one of its input slots to wire it.` });
    }
  };

  const handleLoadPreset = (key: string) => {
    if (key === "") return;
    setGraph(presetGraph(key));
    setInputValues({});
    setSelectedSource(null);
    setValidation(null);
    const preset = PRESETS.find((candidate) => candidate.key === key);
    setFeedback({
      tone: "success",
      text: `Loaded preset "${preset?.label}" — ${preset?.expression}. Toggle the inputs and watch it compute.`,
    });
  };

  const handleReset = () => {
    setGraph(emptyGraph());
    setInputValues({});
    setSelectedSource(null);
    setValidation(null);
    setFeedback({ tone: "info", text: "Canvas cleared. Add inputs and gates from the toolbar." });
  };

  const handleToggleInput = (id: string) => {
    setInputValues((current) => ({ ...current, [id]: current[id] === 1 ? 0 : 1 }));
  };

  const handleSelectSource = (id: string | null) => {
    setSelectedSource(id);
    if (id !== null) {
      setFeedback({ tone: "info", text: `Wiring from "${id}" — now click an input slot on a gate. Click "out" again to cancel.` });
    }
  };

  const handleWireSlot = (toId: string, slot: number) => {
    if (selectedSource === null) {
      setFeedback({
        tone: "info",
        text: "First click the OUT button on the node you want to connect FROM, then click this slot.",
      });
      return;
    }
    const ok = applyGraph((current) => wire(current, selectedSource, toId, slot));
    if (ok) {
      setSelectedSource(null);
      setFeedback({ tone: "success", text: `Wired ${selectedSource} → ${toId} input ${slot + 1}.` });
    }
  };

  const handleUnwireSlot = (toId: string, slot: number) => {
    const ok = applyGraph((current) => unwire(current, toId, slot));
    if (ok) {
      setFeedback({ tone: "info", text: `Disconnected input ${slot + 1} of ${toId}. Unwired inputs read 0.` });
    }
  };

  const handleRemoveNode = (id: string) => {
    applyGraph((current) => removeNode(current, id));
    setInputValues((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    if (selectedSource === id) setSelectedSource(null);
  };

  const handleValidate = () => {
    const gates = graph.nodes.filter((node) => node.kind === "gate");
    if (gates.length === 0) {
      setValidation({ tone: "warning", text: "Nothing to check yet — add at least one gate from the toolbar." });
      return;
    }
    const unwiredSlots = gates.flatMap((gate) =>
      gate.inputs
        .map((source, slot) => (source === null ? `${gate.id} (${GATES[gate.gate ?? "AND"].label}) input ${slot + 1}` : null))
        .filter((entry): entry is string => entry !== null),
    );
    if (unwiredSlots.length > 0) {
      setValidation({
        tone: "warning",
        text: `Check your wiring: ${unwiredSlots.join(", ")} ${unwiredSlots.length > 1 ? "are" : "is"} still unwired (unwired inputs read 0). No feedback loops were found.`,
      });
      return;
    }
    setValidation({
      tone: "success",
      text: "Circuit looks good: every gate input is wired and there are no feedback loops. Circuits here are combinational — they must not feed back into themselves.",
    });
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-2 rounded-md border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-medium text-accent">
            <Hammer className="size-3.5" aria-hidden="true" />
            Module 1 — Logic Gates
          </span>
          <Link
            href="/logic"
            className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-fg"
          >
            <ArrowLeft className="size-3.5" aria-hidden="true" />
            Back to the gate playground
          </Link>
        </div>
        <h1 className="text-3xl font-semibold tracking-tight text-fg sm:text-4xl">
          Circuit Builder
        </h1>
        <p className="max-w-2xl text-sm text-muted sm:text-base">
          Combine gates the way exam questions do. Add inputs and gates, click
          one node&apos;s <span className="font-mono text-fg">out</span> and then a
          gate&apos;s input slot to draw a wire, and watch every intermediate
          value compute live.
        </p>
      </header>

      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="flex min-w-0 flex-col gap-6">
          {/* Toolbar */}
          <Card>
            <CardHeader>
              <CardTitle>Toolbar</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddInput}
                  aria-disabled={inputCount >= MAX_INPUTS}
                >
                  + Input {inputCount < MAX_INPUTS ? `(${inputCount + 1})` : "(max 3)"}
                </Button>
                {GATE_KEYS.map((key) => (
                  <Button key={key} variant="secondary" size="sm" onClick={() => handleAddGate(key)}>
                    + {GATES[key].label}
                  </Button>
                ))}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-56">
                  <Select
                    aria-label="Load a preset circuit"
                    defaultValue=""
                    onChange={(event) => handleLoadPreset(event.target.value)}
                  >
                    <option value="" disabled>
                      Load a preset…
                    </option>
                    {PRESETS.map((preset) => (
                      <option key={preset.key} value={preset.key}>
                        {preset.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <Button variant="outline" size="sm" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="sm" onClick={handleValidate}>
                  <Unplug className="size-3.5" aria-hidden="true" />
                  Validate circuit
                </Button>
              </div>
              {feedback && (
                <Alert tone={feedback.tone === "success" ? "success" : feedback.tone === "danger" ? "danger" : "info"}>
                  {feedback.text}
                </Alert>
              )}
            </CardContent>
          </Card>

          {/* Canvas */}
          <Card>
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle>Canvas</CardTitle>
              <Badge tone="neutral">{graph.nodes.length} nodes</Badge>
            </CardHeader>
            <CardContent>
              {graph.nodes.length === 0 ? (
                <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-border text-sm text-muted">
                  Empty canvas — add an input and a gate from the toolbar.
                </div>
              ) : (
                <CircuitCanvas
                  graph={graph}
                  positions={positions}
                  values={values}
                  selectedSource={selectedSource}
                  inputValues={inputValues}
                  onToggleInput={handleToggleInput}
                  onSelectSource={handleSelectSource}
                  onWireSlot={handleWireSlot}
                  onUnwireSlot={handleUnwireSlot}
                  onRemoveNode={handleRemoveNode}
                />
              )}
              <p className="mt-3 text-xs text-muted">
                Wires glow in the accent colour when they carry 1. Click a wired
                slot (with nothing selected) to disconnect it. Everything is
                computed live from the real gate definitions.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Side panel */}
        <div className="flex min-w-0 flex-col gap-6">
          {validation && <Alert tone={validation.tone === "success" ? "success" : "warning"} title="Validation">{validation.text}</Alert>}

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Table2 className="size-4 text-accent" aria-hidden="true" />
                Circuit truth table
              </CardTitle>
            </CardHeader>
            <CardContent>
              {truthTable.table ? (
                <>
                  <Table>
                    <TableHead>
                      <TableRow className="hover:bg-transparent">
                        {truthTable.table.inputs.map((id) => (
                          <TH key={id}>{id}</TH>
                        ))}
                        {truthTable.table.outputs.map((id) => (
                          <TH key={id}>
                            {id}
                            <span className="ml-1 font-normal text-muted">
                              {GATES[
                                graph.nodes.find((node) => node.id === id)?.gate ?? "AND"
                              ].label}
                            </span>
                          </TH>
                        ))}
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {truthTable.table.rows.map((row, index) => (
                        <TableRow key={index}>
                          {truthTable.table?.inputs.map((id) => (
                            <TD key={id} className="font-mono">
                              {row.input[id]}
                            </TD>
                          ))}
                          {truthTable.table?.outputs.map((id) => (
                            <TD
                              key={id}
                              className={cn(
                                "font-mono font-semibold",
                                row.outputs[id] === 1 ? "text-accent" : "text-muted",
                              )}
                            >
                              {row.outputs[id]}
                            </TD>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                  <p className="mt-3 text-xs text-muted">
                    Output columns are labelled by gate id — find each one on the
                    canvas.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{truthTable.error}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>How to wire</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm text-fg">
              <p>
                <span className="font-semibold">1.</span> Click the{" "}
                <span className="font-mono text-accent">out</span> button on a
                node — it becomes the wiring source.
              </p>
              <p>
                <span className="font-semibold">2.</span> Click an{" "}
                <span className="font-mono">in 1 / in 2</span> slot on a gate to
                connect it.
              </p>
              <p>
                <span className="font-semibold">3.</span> Click a wired slot
                again to disconnect. Unwired inputs read 0.
              </p>
              <p className="text-xs text-muted">
                Feedback loops are rejected — combinational circuits must not
                feed back into themselves.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
