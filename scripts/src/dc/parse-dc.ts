/** Extract `const <var> = "<url>";` asset declarations from a get_design_context blob. */
export function extractAssets(jsx: string): Record<string, string> {
  const re = /const\s+(\w+)\s*=\s*"([^"]+)"\s*;/g;
  const out: Record<string, string> = {};
  let m: RegExpExecArray | null;
  while ((m = re.exec(jsx)) !== null) out[m[1]] = m[2];
  return out;
}
