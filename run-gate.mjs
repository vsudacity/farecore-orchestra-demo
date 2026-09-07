import { check } from "./tests/invariants.ts";

const findings = check();
if (findings.length === 0) {
  console.log("gate PASSED: all invariants hold");
  process.exit(0);
}
console.log(`gate FAILED: ${findings.length} finding(s)`);
for (const f of findings) {
  console.log(`  ${f.rule} ${f.path}:${f.line} -> ${f.remediation}`);
  console.log(`     ${f.detail}`);
}
process.exit(1);
