/**
 * Single release transaction for official addons.
 *
 * Builds the bundles, hashes the exact artifacts that were produced, and emits
 * the catalog INSERT statements for those same bytes. Build once, hash, upload
 * that file, paste the SQL — the digest always describes the artifact that was
 * actually uploaded.
 *
 * This script must never be used to reconstruct a digest for a release that is
 * already published: rebuilding produces different bytes. Hash the object that
 * is already in R2 instead (see the website repo's backfill utility).
 *
 * Usage:
 *   node scripts/release-official.mjs                 # build, then hash + emit SQL
 *   node scripts/release-official.mjs --skip-build    # hash the current dist zips
 *   node scripts/release-official.mjs --only swingfolio-addon
 */
import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { getAddonRecords, repoRoot, displayName, description } from "./lib/addon-records.mjs";
import { downloadUrl, r2Key } from "./lib/distribution.mjs";

const args = process.argv.slice(2);
const skipBuild = args.includes("--skip-build");
const onlyIndex = args.indexOf("--only");
const only = onlyIndex === -1 ? null : args[onlyIndex + 1];
const outIndex = args.indexOf("--out");
const outFile = outIndex === -1 ? null : args[outIndex + 1];

function sqlString(value) {
  if (value === undefined || value === null) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function fail(message) {
  console.error(`error: ${message}`);
  process.exit(1);
}

if (!skipBuild) {
  const filter = only ? `./official/${only}` : "./official/*";
  const result = spawnSync("pnpm", ["-r", "--filter", filter, "bundle"], {
    cwd: repoRoot,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    fail("bundle:official failed; nothing was hashed");
  }
}

const records = (await getAddonRecords())
  .filter((record) => record.metadata.trust === "official")
  .filter((record) => (only ? record.metadata.id === only : true));

if (records.length === 0) {
  fail(only ? `no official addon with id "${only}"` : "no official addons found");
}

const statements = [];

for (const record of records) {
  const { metadata } = record;
  const version = metadata.release?.version;
  if (!version) {
    fail(`${record.relativePath}: release.version is required to publish`);
  }

  // The bundler writes <addon>/dist/<id>-<version>.zip; accept the common
  // fallbacks rather than guessing silently.
  const candidates = [
    path.join(record.addonDir, "dist", `${metadata.id}-${version}.zip`),
    path.join(record.addonDir, "dist", `${metadata.id}.zip`),
    path.join(record.addonDir, `${metadata.id}-${version}.zip`),
  ];
  const artifactPath = candidates.find((candidate) => existsSync(candidate));
  if (!artifactPath) {
    fail(
      `${metadata.id}: no built artifact found. Looked for:\n  ${candidates
        .map((candidate) => path.relative(repoRoot, candidate))
        .join("\n  ")}`,
    );
  }

  const bytes = await readFile(artifactPath);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const key = r2Key(metadata.id, version);
  const url = downloadUrl(metadata.id, version);

  if (metadata.distribution?.r2Path !== key) {
    fail(
      `${record.relativePath}: distribution.r2Path must be "${key}"; run pnpm validate:addons`,
    );
  }

  console.log(`\n${metadata.id} ${version}`);
  console.log(`  artifact : ${path.relative(repoRoot, artifactPath)}`);
  console.log(`  bytes    : ${bytes.length}`);
  console.log(`  sha256   : ${sha256}`);
  console.log(`  r2 key   : ${key}`);
  console.log(`  url      : ${url}`);

  statements.push(
    [
      `-- ${displayName(record)} v${version}`,
      `-- upload: ${path.relative(repoRoot, artifactPath)} -> r2://${key}  (${bytes.length} bytes)`,
      `-- verify: curl -sL ${url} | shasum -a 256   # expect ${sha256}`,
      "INSERT INTO addons (",
      "  id, name, version, description, author, download_url, downloads, rating, review_count,",
      "  tags, status, is_featured, is_critical, has_breaking_changes, release_notes,",
      "  changelog_url, min_wealthfolio_version, sha256, created_at, updated_at",
      ") VALUES (",
      `  ${sqlString(metadata.id)},`,
      `  ${sqlString(displayName(record))},`,
      `  ${sqlString(version)},`,
      `  ${sqlString(description(record))},`,
      "  'Wealthfolio',",
      `  ${sqlString(url)},`,
      "  0, 0, 0,",
      `  ${sqlString(JSON.stringify(metadata.tags ?? []))},`,
      `  ${sqlString(metadata.status)},`,
      `  ${metadata.featured ? 1 : 0}, ${metadata.release.critical ? 1 : 0}, ${metadata.release.breaking ? 1 : 0},`,
      `  ${sqlString(metadata.release.notes)},`,
      `  ${sqlString(metadata.release.changelogUrl)},`,
      `  ${sqlString(metadata.release.minWealthfolioVersion)},`,
      `  ${sqlString(sha256)},`,
      "  CURRENT_TIMESTAMP,",
      "  CURRENT_TIMESTAMP",
      ");",
    ].join("\n"),
  );
}

const header = [
  "-- Generated by scripts/release-official.mjs.",
  "-- The sha256 values describe the exact artifacts listed above; upload those files, not a rebuild.",
  "-- Requires the addons.sha256 column (website repo: db/migrations, addon sha256 migration).",
].join("\n");

const sql = `${header}\n\n${statements.join("\n\n")}\n`;

if (outFile) {
  await writeFile(outFile, sql);
  console.log(`\nWrote ${outFile}`);
} else {
  console.log("\n--- catalog SQL ---\n");
  console.log(sql);
}
