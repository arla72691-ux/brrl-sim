// ─── Shared design tokens ─────────────────────────────────────────────────────
export const F = "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', Arial, sans-serif";

export const C = {
  bg:       "#f5f5f7",
  card:     "#ffffff",
  border:   "#d2d2d7",
  borderLo: "#e8e8ed",
  accent:   "#A100FF",   // Accenture purple
  accentBg: "#f3e6ff",
  t1:       "#1d1d1f",
  t2:       "#424245",
  t3:       "#86868b",
  t4:       "#aeaeb2",
  up:       "#1d8348",
  upBg:     "#eafaf1",
  down:     "#c0392b",
  downBg:   "#fdedec",
  warn:     "#9a5e00",
  warnBg:   "#fef9e7",
  scoreA:   "#1d8348",
  scoreB:   "#1a6eb5",
  scoreC:   "#9a5e00",
  scoreD:   "#c0392b",
};

export const scoreColor = s => s >= 9 ? C.scoreA : s >= 7 ? C.scoreB : s >= 5 ? C.scoreC : C.scoreD;

// ─── Grade functions ──────────────────────────────────────────────────────────
export function part1Grade(score) {
  if (score >= 27) return { l: "A",  label: "Managing Director", c: C.scoreA };
  if (score >= 21) return { l: "B",  label: "Senior Manager",    c: C.scoreA };
  if (score >= 15) return { l: "C",  label: "Manager",           c: C.scoreB };
  if (score >= 9)  return { l: "D",  label: "Consultant",        c: C.scoreC };
  if (score >= 5)  return { l: "E",  label: "Analyst",           c: C.scoreD };
  return                   { l: "F",  label: "Associate",         c: C.scoreD };
}

export function combinedGrade(total) {
  if (total >= 54) return { l: "A+", label: "Managing Director", c: C.scoreA };
  if (total >= 46) return { l: "A",  label: "Senior Manager",    c: C.scoreA };
  if (total >= 38) return { l: "B",  label: "Manager",           c: C.scoreB };
  if (total >= 28) return { l: "C",  label: "Consultant",        c: C.scoreC };
  if (total >= 16) return { l: "D",  label: "Analyst",           c: C.scoreD };
  return                   { l: "E",  label: "Associate",         c: C.scoreD };
}
