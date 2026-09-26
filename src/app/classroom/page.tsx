import type { Metadata } from "next";
import { Suspense } from "react";
import { ClassroomMode } from "@/components/classroom/ClassroomMode";
import { Spinner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Classroom Mode",
  description:
    "Projector-ready guided experiments for teachers: learning objectives, giant controls, fullscreen, and shareable deep links.",
};

export default function ClassroomPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size={32} label="Preparing classroom mode…" />
        </div>
      }
    >
      <ClassroomMode />
    </Suspense>
  );
}
