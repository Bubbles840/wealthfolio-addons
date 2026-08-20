import { writeFile } from "node:fs/promises";
import path from "node:path";
import {
  authorName,
  description,
  displayName,
  getAddonRecords,
  releaseVersion,
  repoRoot,
} from "./lib/addon-records.mjs";

function communityRow(record) {
  const metadata = record.metadata;
  const repo = metadata.repository ? `[Repo](${metadata.repository})` : "";
  return `| ${displayName(record)} | ${authorName(metadata.author)} | ${description(record)} | ${metadata.status} | ${repo} |`;
}

function officialRow(record) {
  const metadata = record.metadata;
  return `| ${displayName(record)} | ${description(record)} | ${metadata.status} | ${releaseVersion(record)} |`;
}

const records = await getAddonRecords();
const official = records.filter((record) => record.metadata.trust === "official");
const community = records.filter((record) => record.metadata.trust === "community");

const communityHeader =
  "| Addon | Publisher | Description | Status | Repo |\n| --- | --- | --- | --- | --- |";
const officialHeader =
  "| Addon | Description | Status | Version |\n| --- | --- | --- | --- |";

await writeFile(
  path.join(repoRoot, "community/README.md"),
  `# Community Addons

Community addons are independently published. Wealthfolio does not build, host,
audit, endorse, or support them. This directory is a discovery listing: the
package is downloaded from the publisher's own repository and installed with
**Install from File** in Wealthfolio.

Listing requirements and the publisher attestation are in
[POLICIES.md](../POLICIES.md).

${communityHeader}
${community.map(communityRow).join("\n")}

Status meanings are in [CONTRIBUTING.md](../CONTRIBUTING.md#status-values).
Only \`active\` entries appear on [wealthfolio.app/addons/community](https://wealthfolio.app/addons/community);
\`pending\` entries are waiting on confirmation from their publisher.
`,
);

await writeFile(
  path.join(repoRoot, "official/README.md"),
  `# Official Addons

Official addons are built, distributed, and supported by Wealthfolio. They are
the only addons installable directly from within the app.

${officialHeader}
${official.map(officialRow).join("\n")}
`,
);

console.log("Generated official/README.md and community/README.md");
