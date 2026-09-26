import type { Metadata } from "next";
import { PhysicsLab } from "@/components/physics/PhysicsLab";

export const metadata: Metadata = {
  title: "Physics Circuits Lab",
  description:
    "Ohm's law solver with live substitution and series/parallel resistor networks with voltage-drop bars, power, and safety warnings.",
};

export default function PhysicsPage() {
  return <PhysicsLab />;
}
