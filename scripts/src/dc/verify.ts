import type { EnrichedNode } from "./enriched";

export interface VerifyIssue {
  nodeId: string;
  name: string;
  rule: string;
  detail: string;
}
export interface VerifyReport {
  issues: VerifyIssue[];
  counts: Record<string, number>;
}
export interface VerifyThresholds {
  confidenceMin: number;
  gapResidualMax: number;
  typeResidualMax: number;
  colorDistanceMax: number;
}

export const DEFAULT_VERIFY_THRESHOLDS: VerifyThresholds = {
  confidenceMin: 0.9,
  gapResidualMax: 16,
  typeResidualMax: 12,
  colorDistanceMax: 40,
};

/** Walk the enriched IR and flag every node the pipeline guessed or approximated. Never throws. */
export function verifyIR(
  root: EnrichedNode,
  thresholds: VerifyThresholds = DEFAULT_VERIFY_THRESHOLDS,
): VerifyReport {
  const issues: VerifyIssue[] = [];

  const visit = (n: EnrichedNode): void => {
    const push = (rule: string, detail: string) =>
      issues.push({ nodeId: n.id, name: n.name, rule, detail });
    const L = n.layout;
    const s = n.style;

    if (L.source === "inferred" && L.confidence < thresholds.confidenceMin) {
      push("low-confidence-layout", `${L.layout} @ confidence ${L.confidence}`);
    }
    if (L.gap && Math.abs(L.gap.residualPx) > thresholds.gapResidualMax) {
      push("high-gap-residual", `${L.gap.token} residual ${L.gap.residualPx}`);
    }
    if (s) {
      if (s.textStyleResidualPx != null && Math.abs(s.textStyleResidualPx) > thresholds.typeResidualMax) {
        push("high-type-residual", `${s.textStyle ?? "?"} residual ${s.textStyleResidualPx}`);
      }
      if (s.colorDistance != null && s.colorDistance > thresholds.colorDistanceMax) {
        push("far-color", `${s.colorVar ?? "?"} distance ${s.colorDistance.toFixed(1)}`);
      }
      if (s.bgColorDistance != null && s.bgColorDistance > thresholds.colorDistanceMax) {
        push("far-color", `${s.bgColorVar ?? "?"} distance ${s.bgColorDistance.toFixed(1)}`);
      }
    }
    if (n.role === "text" && (!n.text || n.text.trim() === "")) {
      push("empty-text", "text role with no text content");
    }
    if (n.role === "image" && !n.asset?.url) {
      push("missing-asset", "image role with no asset url");
    }
    if (n.role === "container" && n.children.length >= 2 && L.layout === "stack") {
      push("ambiguous-stack", `${n.children.length} children but stack layout`);
    }

    for (const child of n.children) visit(child);
  };

  visit(root);

  const counts: Record<string, number> = {};
  for (const issue of issues) counts[issue.rule] = (counts[issue.rule] ?? 0) + 1;
  return { issues, counts };
}
