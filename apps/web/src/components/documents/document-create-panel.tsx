"use client";

import { useState } from "react";

import { TabBar } from "@/components/ui/tab-bar";
import { DocumentTextForm } from "./document-text-form";
import { DocumentUploadForm } from "./document-upload-form";

type Mode = "text" | "file";

const TABS = [
  { value: "text", label: "직접 입력" },
  { value: "file", label: "PDF 업로드" },
] as const satisfies readonly { value: Mode; label: string }[];

/** 등록 방식 전환만 담당합니다. 각 폼이 자기 뮤테이션을 들고 있습니다. */
export function DocumentCreatePanel() {
  const [mode, setMode] = useState<Mode>("text");

  return (
    <div className="space-y-6">
      <TabBar tabs={TABS} active={mode} onChange={setMode} />
      {mode === "text" ? <DocumentTextForm /> : <DocumentUploadForm />}
    </div>
  );
}
