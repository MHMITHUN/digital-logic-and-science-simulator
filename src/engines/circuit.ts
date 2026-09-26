/**
 * Combinational circuit builder engine (pure TypeScript, no React).
 *
 * A circuit is a directed acyclic graph of input nodes and gate nodes.
 * This module is deliberately NOT an FPGA simulator: nodes, wires,
 * evaluation, cycle detection, and truth-table generation — nothing more.
 *
 * All functions are pure: they return new graphs and never mutate their
 * arguments, which keeps React state updates predictable.
 */

import { GATES, type Bit, type GateKey } from "./logic";

export interface CircuitNode {
  id: string;
  kind: "input" | "gate";
  /** Gate key (only for kind === "gate"). */
  gate?: GateKey;
  /** Source node ids per input slot; null = unwired (reads 0). */
  inputs: (string | null)[];
}

export interface CircuitGraph {
  nodes: CircuitNode[];
  /** Node ids observed as circuit outputs (truth-table columns). */
  outputs: string[];
}

export class CircuitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CircuitError";
  }
}

export const FEEDBACK_MESSAGE =
  "Circuits must not feed back into themselves — a combinational circuit has no loops.";

const INPUT_LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function emptyGraph(): CircuitGraph {
  return { nodes: [], outputs: [] };
}

export function getNode(graph: CircuitGraph, id: string): CircuitNode | undefined {
  return graph.nodes.find((node) => node.id === id);
}

function requireNode(graph: CircuitGraph, id: string): CircuitNode {
  const node = getNode(graph, id);
  if (!node) {
    throw new CircuitError(`There is no node named "${id}" in this circuit.`);
  }
  return node;
}

/** Next unused input letter (A, B, C, ...) for display-friendly ids. */
function nextInputId(graph: CircuitGraph): string {
  for (const letter of INPUT_LETTERS) {
    if (!getNode(graph, letter)) return letter;
  }
  throw new CircuitError("This lab supports at most 26 input nodes.");
}

function nextGateId(graph: CircuitGraph): string {
  let counter = graph.nodes.filter((node) => node.id.startsWith("g")).length + 1;
  while (getNode(graph, `g${counter}`)) counter += 1;
  return `g${counter}`;
}

export interface AddNodeSpec {
  kind: "input" | "gate";
  gate?: GateKey;
}

/** Add an input or gate node. Returns the new graph and the added node. */
export function addNode(graph: CircuitGraph, spec: AddNodeSpec): { graph: CircuitGraph; node: CircuitNode } {
  if (spec.kind === "input") {
    const node: CircuitNode = { id: nextInputId(graph), kind: "input", inputs: [] };
    return { graph: { nodes: [...graph.nodes, node], outputs: graph.outputs }, node };
  }
  if (!spec.gate || !(spec.gate in GATES)) {
    throw new CircuitError("Adding a gate needs a valid gate key (AND, OR, NOT, ...).");
  }
  const node: CircuitNode = {
    id: nextGateId(graph),
    kind: "gate",
    gate: spec.gate,
    inputs: Array.from({ length: GATES[spec.gate].inputs }, () => null),
  };
  return {
    graph: { nodes: [...graph.nodes, node], outputs: [...graph.outputs, node.id] },
    node,
  };
}

/** Remove a node and clean every dangling wire that pointed at it. */
export function removeNode(graph: CircuitGraph, id: string): CircuitGraph {
  requireNode(graph, id);
  return {
    nodes: graph.nodes
      .filter((node) => node.id !== id)
      .map((node) => ({
        ...node,
        inputs: node.inputs.map((source) => (source === id ? null : source)),
      })),
    outputs: graph.outputs.filter((outputId) => outputId !== id),
  };
}

/**
 * Wire a source node's output into a gate's input slot. Overwrites whatever
 * occupied the slot. Rejects self-wiring and any wire that would close a
 * feedback loop.
 */
export function wire(graph: CircuitGraph, fromId: string, toId: string, toSlot: number): CircuitGraph {
  requireNode(graph, fromId); // validated for existence and a clear error message
  const to = requireNode(graph, toId);

  if (to.kind !== "gate" || !to.gate) {
    throw new CircuitError(
      `"${toId}" is an input node — inputs have no input pins. Wire into a gate instead.`,
    );
  }
  if (fromId === toId) {
    throw new CircuitError(`${FEEDBACK_MESSAGE} A gate cannot feed its own input.`);
  }
  if (toSlot < 0 || toSlot >= to.inputs.length) {
    throw new CircuitError(
      `Slot ${toSlot + 1} does not exist on ${GATES[to.gate].label} "${toId}" — it has ${to.inputs.length} input${to.inputs.length > 1 ? "s" : ""}.`,
    );
  }

  const candidate: CircuitGraph = {
    nodes: graph.nodes.map((node) => {
      if (node.id !== toId) return node;
      const inputs = [...node.inputs];
      inputs[toSlot] = fromId;
      return { ...node, inputs };
    }),
    outputs: graph.outputs,
  };

  const cycle = detectCycle(candidate);
  if (cycle.hasCycle) {
    throw new CircuitError(
      `${FEEDBACK_MESSAGE} This wire would close the loop ${cycle.nodeIds.join(" → ")} → ${cycle.nodeIds[0]}.`,
    );
  }

  return candidate;
}

/** Disconnect whatever drives a gate's input slot. */
export function unwire(graph: CircuitGraph, toId: string, toSlot: number): CircuitGraph {
  const to = requireNode(graph, toId);
  if (to.kind !== "gate") {
    throw new CircuitError(`"${toId}" is an input node — it has no wires to remove.`);
  }
  if (toSlot < 0 || toSlot >= to.inputs.length) {
    throw new CircuitError(
      `Slot ${toSlot + 1} does not exist on gate "${toId}" — it has ${to.inputs.length} input${to.inputs.length > 1 ? "s" : ""}.`,
    );
  }
  return {
    nodes: graph.nodes.map((node) => {
      if (node.id !== toId) return node;
      const inputs = [...node.inputs];
      inputs[toSlot] = null;
      return { ...node, inputs };
    }),
    outputs: graph.outputs,
  };
}

/** Gate nodes whose output nothing else consumes (used as truth-table columns). */
export function sinkNodes(graph: CircuitGraph): CircuitNode[] {
  const used = new Set(graph.nodes.flatMap((node) => node.inputs.filter((source): source is string => source !== null)));
  return graph.nodes.filter((node) => node.kind === "gate" && !used.has(node.id));
}

/** Output columns for the truth table: explicit outputs, else gate sinks. */
export function outputNodes(graph: CircuitGraph): CircuitNode[] {
  const explicit = graph.outputs
    .map((id) => getNode(graph, id))
    .filter((node): node is CircuitNode => node !== undefined);
  return explicit.length > 0 ? explicit : sinkNodes(graph);
}

export interface CycleCheck {
  hasCycle: boolean;
  /** Nodes that sit on a feedback loop (empty when acyclic). */
  nodeIds: string[];
}

/**
 * Detect feedback loops with a depth-first search (three colours).
 * Combinational circuits must stay acyclic.
 */
export function detectCycle(graph: CircuitGraph): CycleCheck {
  const WHITE = 0;
  const GRAY = 1;
  const BLACK = 2;

  const color = new Map<string, number>(graph.nodes.map((node) => [node.id, WHITE]));
  const adjacency = new Map<string, string[]>(graph.nodes.map((node) => [node.id, [] as string[]]));
  graph.nodes.forEach((node) => {
    node.inputs.forEach((source) => {
      if (source !== null) adjacency.get(source)?.push(node.id);
    });
  });

  const inCycle = new Set<string>();

  const visit = (id: string, stack: string[]): void => {
    color.set(id, GRAY);
    stack.push(id);
    for (const next of adjacency.get(id) ?? []) {
      const nextColor = color.get(next);
      if (nextColor === GRAY) {
        // Back edge: everything from `next` up the stack is in the loop.
        const start = stack.indexOf(next);
        stack.slice(start).forEach((member) => inCycle.add(member));
      } else if (nextColor === WHITE) {
        visit(next, stack);
      }
    }
    stack.pop();
    color.set(id, BLACK);
  };

  for (const node of graph.nodes) {
    if (color.get(node.id) === WHITE) visit(node.id, []);
  }

  return {
    hasCycle: inCycle.size > 0,
    nodeIds: graph.nodes.filter((node) => inCycle.has(node.id)).map((node) => node.id),
  };
}

export interface Evaluation {
  /** Value of every node (inputs and gates) under the given assignment. */
  values: Record<string, Bit>;
}

/**
 * Evaluate the circuit: topological order (Kahn's algorithm), gates applied
 * via the real gate definitions. Unwired inputs read 0; missing input
 * assignments default to 0.
 */
export function evaluate(graph: CircuitGraph, inputValues: Record<string, Bit> = {}): Evaluation {
  if (detectCycle(graph).hasCycle) {
    throw new CircuitError(`${FEEDBACK_MESSAGE} Fix the loop before evaluating.`);
  }

  const indegree = new Map<string, number>();
  const consumers = new Map<string, string[]>();
  graph.nodes.forEach((node) => {
    indegree.set(node.id, node.inputs.filter((source) => source !== null).length);
    consumers.set(node.id, []);
  });
  graph.nodes.forEach((node) => {
    node.inputs.forEach((source) => {
      if (source !== null) consumers.get(source)?.push(node.id);
    });
  });

  const queue = graph.nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0).map((node) => node.id);
  const values: Record<string, Bit> = {};
  const ordered: string[] = [];

  while (queue.length > 0) {
    const id = queue.shift() as string;
    ordered.push(id);
    const node = requireNode(graph, id);

    let value: Bit;
    if (node.kind === "input") {
      value = inputValues[id] === 1 ? 1 : 0;
    } else {
      const gate = GATES[node.gate as GateKey];
      const a = resolveInput(graph, values, node.inputs[0]);
      const b = resolveInput(graph, values, node.inputs[1]);
      value = gate.evaluate(a, b);
    }
    values[id] = value;

    for (const consumer of consumers.get(id) ?? []) {
      const remaining = (indegree.get(consumer) ?? 0) - 1;
      indegree.set(consumer, remaining);
      if (remaining === 0) queue.push(consumer);
    }
  }

  if (ordered.length !== graph.nodes.length) {
    throw new CircuitError(`${FEEDBACK_MESSAGE} Evaluation could not finish.`);
  }

  return { values };
}

/** Value of one wire: 0 when unwired (or absent, e.g. NOT's second slot). */
function resolveInput(graph: CircuitGraph, values: Record<string, Bit>, source: string | null | undefined): Bit {
  if (source == null) return 0;
  const value = values[source];
  if (value === undefined) {
    throw new CircuitError(`Node "${source}" was evaluated out of order — this is a bug, not your circuit.`);
  }
  return value;
}

export interface CircuitTruthTable {
  /** Input node ids (each also the variable name). */
  inputs: string[];
  /** Output node ids shown as columns. */
  outputs: string[];
  rows: Array<{
    input: Record<string, Bit>;
    outputs: Record<string, Bit>;
  }>;
}

/** Truth table of the whole circuit — offered when there are 3 or fewer inputs. */
export function toTruthTable(graph: CircuitGraph): CircuitTruthTable {
  const inputs = graph.nodes.filter((node) => node.kind === "input").map((node) => node.id);
  if (inputs.length === 0) {
    throw new CircuitError("Add at least one input node before building a truth table.");
  }
  if (inputs.length > 3) {
    throw new CircuitError(
      `The truth-table panel supports up to 3 inputs — this circuit has ${inputs.length}. Remove an input or read the live values on the canvas.`,
    );
  }
  const outputs = outputNodes(graph);
  if (outputs.length === 0) {
    throw new CircuitError("Add a gate to produce an output before building a truth table.");
  }

  const rows = [];
  for (let index = 0; index < 2 ** inputs.length; index += 1) {
    const input: Record<string, Bit> = {};
    inputs.forEach((id, depth) => {
      const shift = inputs.length - 1 - depth;
      input[id] = ((index >> shift) & 1) as Bit;
    });
    const evaluation = evaluate(graph, input);
    const outputValues: Record<string, Bit> = {};
    outputs.forEach((node) => {
      outputValues[node.id] = evaluation.values[node.id];
    });
    rows.push({ input, outputs: outputValues });
  }

  return { inputs, outputs: outputs.map((node) => node.id), rows };
}

// ---------------------------------------------------------------------------
// Presets (spec 16.3 examples)
// ---------------------------------------------------------------------------

export interface CircuitPreset {
  key: string;
  label: string;
  /** Boolean expression the preset implements (for display). */
  expression: string;
  build: () => CircuitGraph;
}

/** Small imperative builder so preset definitions read like the spec. */
function makeBuilder() {
  let graph = emptyGraph();
  return {
    addInput(): string {
      const result = addNode(graph, { kind: "input" });
      graph = result.graph;
      return result.node.id;
    },
    addGate(gate: GateKey): string {
      const result = addNode(graph, { kind: "gate", gate });
      graph = result.graph;
      return result.node.id;
    },
    connect(from: string, to: string, slot: number): void {
      graph = wire(graph, from, to, slot);
    },
    result(outputs: string[]): CircuitGraph {
      return { nodes: graph.nodes, outputs };
    },
  };
}

export const PRESETS: CircuitPreset[] = [
  {
    key: "a-and-b",
    label: "A AND B",
    expression: "Y = A . B",
    build: () => {
      const builder = makeBuilder();
      const a = builder.addInput();
      const b = builder.addInput();
      const gate = builder.addGate("AND");
      builder.connect(a, gate, 0);
      builder.connect(b, gate, 1);
      return builder.result([gate]);
    },
  },
  {
    key: "a-or-b-and-c",
    label: "(A OR B) AND C",
    expression: "Y = (A + B) . C",
    build: () => {
      const builder = makeBuilder();
      const a = builder.addInput();
      const b = builder.addInput();
      const c = builder.addInput();
      const or = builder.addGate("OR");
      builder.connect(a, or, 0);
      builder.connect(b, or, 1);
      const and = builder.addGate("AND");
      builder.connect(or, and, 0);
      builder.connect(c, and, 1);
      return builder.result([and]);
    },
  },
  {
    key: "a-xor-b",
    label: "A XOR B",
    expression: "Y = A ⊕ B",
    build: () => {
      const builder = makeBuilder();
      const a = builder.addInput();
      const b = builder.addInput();
      const gate = builder.addGate("XOR");
      builder.connect(a, gate, 0);
      builder.connect(b, gate, 1);
      return builder.result([gate]);
    },
  },
  {
    key: "not-a-and-b",
    label: "NOT (A AND B)",
    expression: "Y = (A . B)'",
    build: () => {
      const builder = makeBuilder();
      const a = builder.addInput();
      const b = builder.addInput();
      const and = builder.addGate("AND");
      builder.connect(a, and, 0);
      builder.connect(b, and, 1);
      const not = builder.addGate("NOT");
      builder.connect(and, not, 0);
      return builder.result([not]);
    },
  },
];

/** Build one of the documented preset circuits by key. */
export function presetGraph(key: string): CircuitGraph {
  const preset = PRESETS.find((candidate) => candidate.key === key);
  if (!preset) {
    throw new CircuitError(
      `Unknown preset "${key}". Available: ${PRESETS.map((p) => p.key).join(", ")}.`,
    );
  }
  return preset.build();
}
