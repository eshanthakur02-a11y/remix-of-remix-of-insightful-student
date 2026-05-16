import { useEffect, useState } from "react";
import { students, type Student } from "./mock-data";

type StudentOverride = Partial<Omit<Student, "marks">> & { marks?: Partial<Student["marks"]> };
type Overrides = Record<string, StudentOverride>;

const KEY = "scholaris.student-overrides.v1";

function load(): Overrides {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEY) || "{}"); } catch { return {}; }
}
function save(o: Overrides) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(o));
  window.dispatchEvent(new CustomEvent("student-overrides-changed"));
}

function gradeFor(p: number) {
  return p >= 90 ? "A+" : p >= 80 ? "A" : p >= 70 ? "B" : p >= 60 ? "C" : p >= 50 ? "D" : "F";
}

export function mergeStudent(s: Student, ov: Overrides[string] | undefined): Student {
  if (!ov) return s;
  const marks = { ...s.marks, ...(ov.marks || {}) };
  const total = marks.english + marks.math + marks.science + marks.ssc + marks.python;
  const percentage = Math.round((total / 500) * 1000) / 10;
  return {
    ...s,
    ...ov,
    marks,
    total,
    percentage,
    grade: ov.grade ?? gradeFor(percentage),
  };
}

export function useStudent(regNo: string): [Student | undefined, (patch: Overrides[string]) => void] {
  const base = students.find((s) => s.regNo === regNo);
  const [ov, setOv] = useState<Overrides>(() => load());

  useEffect(() => {
    const h = () => setOv(load());
    window.addEventListener("student-overrides-changed", h);
    window.addEventListener("storage", h);
    return () => {
      window.removeEventListener("student-overrides-changed", h);
      window.removeEventListener("storage", h);
    };
  }, []);

  const merged = base ? mergeStudent(base, ov[regNo]) : undefined;

  const update = (patch: Overrides[string]) => {
    const next = { ...load() };
    const prev = next[regNo] || {};
    next[regNo] = {
      ...prev,
      ...patch,
      marks: { ...(prev.marks || {}), ...(patch.marks || {}) },
    };
    save(next);
    setOv(next);
  };

  return [merged, update];
}
