import { fetchFile, fetchHeadCommit, fetchRepository, parseRepository } from "./github.mjs";
import { requiredNotices } from "./notices.mjs";

/**
 * Facts about a community addon that Wealthfolio can verify, rather than ask a
 * publisher to retype.
 *
 * Everything here is derived from the publisher's own repository — its licence,
 * its manifest — and is presented as derived, dated, and attributed. It is
 * never phrased as the publisher's declaration, because Wealthfolio did not
 * hear it from them.
 *
 * The one thing that cannot be derived is what the addon costs, which lives in
 * `commercialModel` in the listing.
 */

/**
 * The sandbox landed in SDK 3.6 and was a breaking change: direct network
 * access was removed in favour of the permission broker. Anything older than
 * that is at best untested on the current runtime, and anything older than 3.0
 * will not load at all.
 */
const SANDBOX_SDK = [3, 6];

function versionParts(version) {
  const parts = String(version ?? "").split(".").map((part) => Number.parseInt(part, 10));
  return parts.every((part) => Number.isFinite(part)) && parts.length >= 2 ? parts : null;
}

/**
 * Under the 3.6+ sandbox an addon cannot reach the network at all without the
 * `network` permission: direct browser requests are blocked and the broker
 * refuses undeclared hosts. So the absence of that permission is enforced by
 * the runtime, not merely claimed by the publisher.
 */
function deriveDataHandling(manifest) {
  const networkPermission = (manifest.permissions ?? []).find(
    (permission) => permission?.category === "network",
  );

  if (!networkPermission) {
    return {
      userDataLeavesDevice: false,
      externalServices: [],
      basis: "The addon does not request the network permission, so the Wealthfolio runtime blocks all outbound requests.",
    };
  }

  const hosts = manifest.network?.allowedHosts ?? [];
  return {
    userDataLeavesDevice: true,
    externalServices: hosts.map((host) => ({ host })),
    basis: "The addon requests the network permission and may reach the hosts listed above, subject to your approval at install time.",
  };
}

function deriveCompatibility(manifest) {
  const parts = versionParts(manifest.sdkVersion);

  if (!parts) {
    return { state: "unknown", detail: "The manifest declares no usable SDK version." };
  }

  const [major, minor] = parts;

  if (major < 3) {
    return {
      state: "outdated",
      detail: `Built against SDK ${manifest.sdkVersion}, which the current addon runtime cannot load.`,
    };
  }

  if (major === SANDBOX_SDK[0] && minor < SANDBOX_SDK[1]) {
    return {
      state: "legacy",
      detail: `Built against SDK ${manifest.sdkVersion}, before the ${SANDBOX_SDK.join(".")} sandbox change. It may not work on current Wealthfolio.`,
    };
  }

  return { state: "ok", detail: `Built against SDK ${manifest.sdkVersion}.` };
}

/**
 * Reads one community listing's repository. Returns a derived record, or one
 * carrying `problems` when the repository cannot support a public listing.
 */
export async function deriveListing(metadata) {
  const problems = [];
  const warnings = [];
  const repository = parseRepository(metadata.repository ?? "");

  if (!repository) {
    return {
      id: metadata.id,
      repository: metadata.repository ?? null,
      problems: ["repository is not a public github.com URL, so nothing can be verified"],
    };
  }

  const repoData = await fetchRepository(repository);
  if (!repoData) {
    return {
      id: metadata.id,
      repository: metadata.repository,
      problems: ["repository could not be read; it may be private, renamed, or deleted"],
    };
  }

  if (repoData.archived) {
    problems.push("repository is archived");
  }

  const license = repoData.license?.spdx_id;
  const hasLicense = Boolean(license) && license !== "NOASSERTION";
  if (!hasLicense) {
    problems.push(
      "repository has no detectable licence, so users have no right to use the addon",
    );
  }

  const commit = await fetchHeadCommit(repository, repoData.default_branch);
  const manifestSource = commit
    ? await fetchFile(repository, "manifest.json", commit)
    : null;

  let manifest = null;
  if (!manifestSource) {
    problems.push("no manifest.json at the repository root");
  } else {
    try {
      manifest = JSON.parse(manifestSource);
    } catch (error) {
      problems.push(`manifest.json is not valid JSON: ${error.message}`);
    }
  }

  // The runtime keys installed addons by manifest id; the listing id is the
  // directory's page identity. They should match so the two can be
  // cross-referenced later, but a mismatch breaks nothing today.
  const runtimeId = manifest?.id ?? null;

  // Storing credentials for a service the addon has no permission to reach
  // means either the manifest is stale or the feature cannot work.
  const categories = new Set((manifest?.permissions ?? []).map((p) => p?.category));
  if (categories.has("secrets") && !categories.has("network")) {
    warnings.push(
      "declares the secrets permission but not network, so any service it stores credentials for is unreachable",
    );
  }

  if (runtimeId && runtimeId !== metadata.id) {
    warnings.push(`manifest id "${runtimeId}" differs from the listing id "${metadata.id}"`);
  }

  return {
    id: metadata.id,
    runtimeId,
    repository: metadata.repository,
    defaultBranch: repoData.default_branch,
    commit,
    license: hasLicense ? license : null,
    lastPushedAt: repoData.pushed_at ? repoData.pushed_at.slice(0, 10) : null,
    manifest: manifest
      ? {
          name: manifest.name ?? null,
          version: manifest.version ?? null,
          sdkVersion: manifest.sdkVersion ?? null,
          minWealthfolioVersion: manifest.minWealthfolioVersion ?? null,
          permissions: (manifest.permissions ?? []).map((permission) => ({
            category: permission?.category ?? null,
            purpose: permission?.purpose ?? null,
          })),
        }
      : null,
    dataHandling: manifest ? deriveDataHandling(manifest) : null,
    compatibility: manifest ? deriveCompatibility(manifest) : { state: "unknown", detail: "No manifest to read." },
    notices: requiredNotices(metadata.tags),
    problems,
    warnings,
  };
}

/**
 * Problems that prevent a listing from being published publicly.
 *
 * An addon that cannot load is not a listing worth having: the user downloads
 * it, the install fails, and Wealthfolio gets the blame.
 */
export function blockingProblems(derived) {
  const problems = [...(derived.problems ?? [])];
  if (derived.compatibility?.state === "outdated") {
    problems.push(derived.compatibility.detail);
  }
  return problems.filter(
    (problem) =>
      problem.includes("licence") ||
      problem.includes("could not be read") ||
      problem.includes("not a public github.com URL") ||
      problem.includes("manifest.json") ||
      problem.includes("cannot load"),
  );
}
