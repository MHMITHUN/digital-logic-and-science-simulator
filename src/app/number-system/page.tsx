import type { Metadata } from "next";
import { NumberSystemLab } from "@/components/numbers/NumberSystemLab";

export const metadata: Metadata = {
  title: "Number System Lab",
  description:
    "Convert between decimal, binary, octal, and hexadecimal with full step-by-step working — division-remainder, positional expansion, and bit grouping.",
};

export default function NumberSystemPage() {
  return <NumberSystemLab />;
}
