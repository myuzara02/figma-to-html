export interface LintIssue {
  rule: string;
  match: string;
}

/** Deterministic Lumos output checks. Never throws. */
export function lintLumos(html: string): LintIssue[] {
  const issues: LintIssue[] = [];

  for (const m of html.matchAll(/\b\d+(?:\.\d+)?px\b/g)) {
    issues.push({ rule: "no-px", match: m[0] });
  }
  for (const m of html.matchAll(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/g)) {
    issues.push({ rule: "no-hex", match: m[0] });
  }
  for (const _ of html.matchAll(/\sstyle\s*=\s*"/g)) {
    issues.push({ rule: "no-inline-style", match: "style=" });
  }
  for (const m of html.matchAll(/class\s*=\s*"([^"]*)"/g)) {
    for (const cls of m[1].split(/\s+/).filter(Boolean)) {
      const isUtility = cls.startsWith("u-") || cls.startsWith("is-") || cls.startsWith("w-");
      const underscores = (cls.match(/_/g) ?? []).length;
      if (!isUtility && underscores > 3) {
        issues.push({ rule: "max-3-underscores", match: cls });
      }
    }
  }

  return issues;
}
