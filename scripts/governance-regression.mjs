import assert from "node:assert/strict";
import { checkChangedFiles } from "./check-governance.mjs";

assert.deepEqual(checkChangedFiles(["src/app/page.tsx"]).errors, [
  "Every iteration must update docs/DEVELOPMENT_LOG.md.",
]);
assert.deepEqual(checkChangedFiles(["src/app/page.tsx", "docs/DEVELOPMENT_LOG.md"]).errors, []);
assert.deepEqual(checkChangedFiles(["package.json", "docs/DEVELOPMENT_LOG.md"]).errors, [
  "Version metadata changes must update CHANGELOG.md.",
]);
assert.deepEqual(
  checkChangedFiles(["package.json", "docs/DEVELOPMENT_LOG.md", "CHANGELOG.md"]).errors,
  [],
);

console.log("Governance regression checks passed.");
