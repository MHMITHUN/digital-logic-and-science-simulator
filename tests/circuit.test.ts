import { describe, expect, it } from "vitest";
import {
  CircuitError,
  addNode,
  detectCycle,
  emptyGraph,
  evaluate,
  getNode,
  PRESETS,
  presetGraph,
  removeNode,
  toTruthTable,
  unwire,
  wire,
  type CircuitGraph,
} from "@/engines/circuit";

/** Build a graph quickly inside tests: a helper, not part of the engine. */
function fixture(): CircuitGraph {
  let graph = emptyGraph();
  const a = addNode(graph, { kind: "input" });
  graph = a.graph;
  const b = addNode(graph, { kind: "input" });
  graph = b.graph;
  const gate = addNode(graph, { kind: "gate", gate: "AND" });
  graph = gate.graph;
  graph = wire(graph, "A", "g1", 0);
  graph = wire(graph, "B", "g1", 1);
  return graph;
}

describe("addNode", () => {
  it("names inputs A, B, C... and gates g1, g2...", () => {
    let graph = emptyGraph();
    const a = addNode(graph, { kind: "input" });
    graph = a.graph;
    const b = addNode(graph, { kind: "input" });
    graph = b.graph;
    const gate = addNode(graph, { kind: "gate", gate: "OR" });
    graph = gate.graph;

    expect(a.node.id).toBe("A");
    expect(b.node.id).toBe("B");
    expect(gate.node.id).toBe("g1");
    expect(gate.node.inputs).toEqual([null, null]);
    expect(graph.outputs).toEqual(["g1"]);
  });

  it("gives NOT gates a single input slot", () => {
    const { node } = addNode(emptyGraph(), { kind: "gate", gate: "NOT" });
    expect(node.inputs).toEqual([null]);
  });

  it("does not mutate the original graph", () => {
    const graph = emptyGraph();
    addNode(graph, { kind: "input" });
    expect(graph.nodes).toHaveLength(0);
  });
});

describe("wire / unwire", () => {
  it("wires a source into a gate slot", () => {
    const graph = fixture();
    const gate = getNode(graph, "g1");
    expect(gate?.inputs).toEqual(["A", "B"]);
  });

  it("overwrites an occupied slot (rewiring)", () => {
    const graph = wire(fixture(), "A", "g1", 1);
    expect(getNode(graph, "g1")?.inputs).toEqual(["A", "A"]);
  });

  it("unwires a slot", () => {
    const graph = unwire(fixture(), "g1", 0);
    expect(getNode(graph, "g1")?.inputs).toEqual([null, "B"]);
  });

  it("rejects wiring into an input node", () => {
    expect(() => wire(fixture(), "A", "B", 0)).toThrow(/no input pins/);
  });

  it("rejects a bad slot index with a teaching message", () => {
    expect(() => wire(fixture(), "A", "g1", 5)).toThrow(/Slot 6 does not exist/);
  });

  it("rejects unknown node ids", () => {
    expect(() => wire(fixture(), "X", "g1", 0)).toThrow(CircuitError);
    expect(() => unwire(fixture(), "nope", 0)).toThrow(CircuitError);
  });

  it("rejects a wire that would close a feedback loop", () => {
    let graph = emptyGraph();
    graph = addNode(graph, { kind: "input" }).graph;
    graph = addNode(graph, { kind: "gate", gate: "AND" }).graph; // g1
    graph = addNode(graph, { kind: "gate", gate: "NOT" }).graph; // g2
    graph = wire(graph, "A", "g1", 0);
    graph = wire(graph, "g1", "g2", 0);
    expect(() => wire(graph, "g2", "g1", 1)).toThrow(/must not feed back into themselves/);
  });
});

describe("removeNode", () => {
  it("removes the node and cleans dangling wires", () => {
    const graph = removeNode(fixture(), "A");
    expect(getNode(graph, "A")).toBeUndefined();
    expect(getNode(graph, "g1")?.inputs).toEqual([null, "B"]);
    expect(graph.nodes).toHaveLength(2);
  });

  it("removes the node from the outputs list", () => {
    const graph = removeNode(fixture(), "g1");
    expect(graph.outputs).toEqual([]);
  });

  it("rejects unknown ids", () => {
    expect(() => removeNode(fixture(), "Z")).toThrow(CircuitError);
  });
});

describe("detectCycle", () => {
  it("reports acyclic graphs as clean", () => {
    const check = detectCycle(fixture());
    expect(check.hasCycle).toBe(false);
    expect(check.nodeIds).toEqual([]);
  });

  it("detects a loop built outside wire() and names the nodes", () => {
    const cyclic: CircuitGraph = {
      nodes: [
        { id: "A", kind: "input", inputs: [] },
        { id: "g1", kind: "gate", gate: "AND", inputs: ["A", "g2"] },
        { id: "g2", kind: "gate", gate: "NOT", inputs: ["g1"] },
      ],
      outputs: ["g2"],
    };
    const check = detectCycle(cyclic);
    expect(check.hasCycle).toBe(true);
    expect(check.nodeIds).toContain("g1");
    expect(check.nodeIds).toContain("g2");
    expect(check.nodeIds).not.toContain("A");
  });

  it("does not false-positive on fan-out (same source wired twice)", () => {
    const graph = wire(fixture(), "A", "g1", 1); // A feeds both slots
    expect(detectCycle(graph).hasCycle).toBe(false);
  });
});

describe("evaluate", () => {
  const andCases: Array<[Record<string, 0 | 1>, 0 | 1]> = [
    [{ A: 1, B: 1 }, 1],
    [{ A: 1, B: 0 }, 0],
    [{ A: 0, B: 1 }, 0],
    [{ A: 0, B: 0 }, 0],
  ];

  it.each(andCases)("AND fixture with %j gives %i", (input, expected) => {
    expect(evaluate(fixture(), input).values.g1).toBe(expected);
  });

  it("defaults missing inputs and unwired slots to 0", () => {
    expect(evaluate(fixture()).values.g1).toBe(0);
    const partial = unwire(fixture(), "g1", 1);
    expect(evaluate(partial, { A: 1, B: 1 }).values.g1).toBe(0);
  });

  it("throws on a cyclic graph instead of hanging", () => {
    const cyclic: CircuitGraph = {
      nodes: [
        { id: "g1", kind: "gate", gate: "AND", inputs: ["g2", null] },
        { id: "g2", kind: "gate", gate: "NOT", inputs: ["g1"] },
      ],
      outputs: [],
    };
    expect(() => evaluate(cyclic)).toThrow(/feed back/);
  });
});

describe("presets", () => {
  it("provides the four spec examples", () => {
    expect(PRESETS.map((preset) => preset.label)).toEqual([
      "A AND B",
      "(A OR B) AND C",
      "A XOR B",
      "NOT (A AND B)",
    ]);
  });

  it("A AND B preset evaluates correctly", () => {
    const graph = presetGraph("a-and-b");
    expect(evaluate(graph, { A: 1, B: 1 }).values.g1).toBe(1);
    expect(evaluate(graph, { A: 1, B: 0 }).values.g1).toBe(0);
  });

  it("(A OR B) AND C preset evaluates correctly", () => {
    const graph = presetGraph("a-or-b-and-c");
    const values = evaluate(graph, { A: 0, B: 1, C: 1 }).values;
    expect(values.g1).toBe(1); // OR gate
    expect(values.g2).toBe(1); // final AND
    expect(evaluate(graph, { A: 1, B: 0, C: 0 }).values.g2).toBe(0);
  });

  it("A XOR B preset evaluates correctly", () => {
    const graph = presetGraph("a-xor-b");
    expect(evaluate(graph, { A: 1, B: 0 }).values.g1).toBe(1);
    expect(evaluate(graph, { A: 1, B: 1 }).values.g1).toBe(0);
  });

  it("NOT (A AND B) preset evaluates correctly", () => {
    const graph = presetGraph("not-a-and-b");
    expect(evaluate(graph, { A: 1, B: 1 }).values.g2).toBe(0);
    expect(evaluate(graph, { A: 0, B: 0 }).values.g2).toBe(1);
  });

  it("rejects unknown preset keys", () => {
    expect(() => presetGraph("nand-everything")).toThrow(CircuitError);
  });
});

describe("toTruthTable", () => {
  it("builds the golden table for the AND preset", () => {
    const table = toTruthTable(presetGraph("a-and-b"));
    expect(table.inputs).toEqual(["A", "B"]);
    expect(table.outputs).toEqual(["g1"]);
    expect(table.rows).toHaveLength(4);
    expect(table.rows.map((row) => row.outputs.g1)).toEqual([0, 0, 0, 1]);
    expect(table.rows[2].input).toEqual({ A: 1, B: 0 });
  });

  it("builds an 8-row table for the 3-input preset", () => {
    const table = toTruthTable(presetGraph("a-or-b-and-c"));
    expect(table.rows).toHaveLength(8);
    // Row 6 = A=1 B=1 C=0: (1+1).0 = 0.
    expect(table.rows[6].outputs.g2).toBe(0);
    // Row 3 = A=0 B=1 C=1: (0+1).1 = 1.
    expect(table.rows[3].outputs.g2).toBe(1);
  });

  it("refuses circuits with more than 3 inputs", () => {
    let graph = emptyGraph();
    for (let i = 0; i < 4; i += 1) {
      graph = addNode(graph, { kind: "input" }).graph;
    }
    graph = addNode(graph, { kind: "gate", gate: "AND" }).graph;
    graph = wire(graph, "A", "g1", 0);
    graph = wire(graph, "B", "g1", 1);
    expect(() => toTruthTable(graph)).toThrow(/up to 3 inputs/);
  });

  it("refuses circuits with no gates", () => {
    let graph = emptyGraph();
    graph = addNode(graph, { kind: "input" }).graph;
    expect(() => toTruthTable(graph)).toThrow(/Add a gate/);
  });
});
