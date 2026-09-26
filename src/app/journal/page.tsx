import type { Metadata } from "next";
import { JournalApp } from "@/components/journal/JournalApp";

export const metadata: Metadata = {
  title: "Experiment Journal",
  description:
    "Record every experiment: inputs, prediction, actual result, observation, and conclusion — saved in this browser, exportable as CSV.",
};

export default function JournalPage() {
  return <JournalApp />;
}
