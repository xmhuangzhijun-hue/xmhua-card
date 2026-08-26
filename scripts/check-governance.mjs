import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const DEVELOPMENT_LOG = "docs/DEVELOPMENT_LOG.md";
const CHANGELOG = "CHANGELOG.md";

export function checkChangedFiles(files) {
  const normalized = [...new Set(files.map((file) => file.trim().replaceAll("\\", "/")))]
    .filter(Boolean);
  const errors = [];

  if (normalized.length > 0 && !normalized.includes(DEVELOPMENT_LOG)) {
    errors.push(`Every iteration must update ${DEVELOPMENT_LOG}.`);
  }

  const changesVersion = normalized.some(
    (file) => file === "package.json" || file === "package-lock.json" || file.startsWith("versions/"),
  );
  if (changesVersion && !normalized.includes(CHANGELOG)) {
    errors.push(`Version metadata changes must update ${CHANGELOG}.`);
  }

  return { errors, files: normalized };
}

function argumentValue(args, name) {
  const index = args.indexOf(name);
  return index === -1 ? undefined : args[index + 1];
}

function changedFilesFromGit(base, head) {
  return execFileSync("git", ["diff", "--name-only", `${base}...${head}`], {
    encoding: "utf8",
  }).split(/\r?\n/u);
}

function main(args) {
  const base = argumentValue(args, "--base");
  const head = argumentValue(args, "--head");
  const explicitFiles = args.filter((arg) => !arg.startsWith("--") && arg !== base && arg !== head);

  if ((!base || !head) && explicitFiles.length === 0) {
    throw new Error("Provide --base <sha> --head <sha>, or one or more changed file paths.");
  }

  const result = checkChangedFiles(base && head ? changedFilesFromGit(base, head) : explicitFiles);
  if (result.errors.length > 0) {
    for (const error of result.errors) console.error(`::error::${error}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Governance check passed for ${result.files.length} changed file(s).`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2));
}
