import type { Metadata } from "next";
import { BooleanLab } from "@/components/boolean/BooleanLab";

export const metadata: Metadata = {
  title: "Boolean Algebra Lab",
  description:
    "Truth tables from typed expressions, step-by-step simplification, De Morgan's laws, and an interactive Karnaugh map exercise.",
};

export default function BooleanPage() {
  return <BooleanLab />;
}
