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
 * access was removed in favour of the permission broker.
 *
 * This is a caution, never a block. The host records `sdkVersion` but does not
 * enforce it (only `minWealthfolioVersion` is enforced), so an older addon
 * installs normally and may well work — a local-only addon touches nothing the
 * sandbox changed. Saying "this cannot load" would be a claim about someone
 * else's software that Wealthfolio has not tested.
 */
const SANDBOX_SDK = [3, 6];

function versionParts(version) {
  const parts = String(version ?? "").split(".").map((part) => Number.parseInt(part, 10));
  return parts.every((part) => Number.isFinite(part)) && parts.length >= 2 ? parts : null;
}

/**
 * Under the 3.6+ sandbox an addon cannot reach the network without the
 * `network` permission: direct browser requests are blocked and the broker
 * refuses undeclared hosts. That makes the absence of the permission a fact
 * about the runtime rather than a claim by the publisher.
 *
 * The guarantee does not extend backwards. A pre-3.6 addon was written for a
 * host where `fetch` worked, so a missing permission says nothing at all —
 * the Lunch Money addon calls the Lunch Money API with the user's key and
 * declares no network permission, because on SDK 3.1.1 it did not need one.
 * Reporting "no data leaves your device" for such an addon would be false, and
 * published to users as though Wealthfolio had checked.
 */
function deriveDataHandling(manifest, compatibility) {
  const networkPermission = (manifest.permissions ?? []).find(
    (permission) => permission?.category === "network",
  );

  if (compatibility.state === "predates-sandbox") {
    return {
      userDataLeavesDevice: null,
      externalServices: [],
      basis: "Built before the 3.6 sandbox, when addons could reach the network without declaring it, so the manifest cannot show where data goes.",
    };
  }

  if (compatibility.state !== "current") {
    return {
      userDataLeavesDevice: null,
      externalServices: [],
      basis: "The manifest declares no usable SDK version, so it is not known whether the sandbox constrains this addon's network access.",
    };
  }

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
  const predatesSandbox =
    major < SANDBOX_SDK[0] || (major === SANDBOX_SDK[0] && minor < SANDBOX_SDK[1]);

  if (predatesSandbox) {
    return {
      state: "predates-sandbox",
      detail: `Built against SDK ${manifest.sdkVersion}, before the ${SANDBOX_SDK.join(".")} sandbox change. It may not work on current Wealthfolio.`,
    };
  }

  return { state: "current", detail: `Built against SDK ${manifest.sdkVersion}.` };
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

  const compatibility = manifest
    ? deriveCompatibility(manifest)
    : { state: "unknown", detail: "No manifest to read." };

  // The runtime keys installed addons by manifest id; the listing id is the
  // directory's page identity. They should match so the two can be
  // cross-referenced later, but a mismatch breaks nothing today.
  const runtimeId = manifest?.id ?? null;

  // Only meaningful under the sandbox. Before 3.6 an addon could reach a
  // service without declaring anything, so a missing network permission says
  // nothing about whether its credentials are usable — the Lunch Money addon
  // stores a key and calls the API directly.
  const categories = new Set((manifest?.permissions ?? []).map((p) => p?.category));
  if (
    compatibility.state === "current" &&
    categories.has("secrets") &&
    !categories.has("network")
  ) {
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
    dataHandling: manifest ? deriveDataHandling(manifest, compatibility) : null,
    compatibility,
    notices: requiredNotices(metadata.tags),
    problems,
    warnings,
  };
}

/**
 * Problems that prevent a listing from being published publicly: no licence to
 * use it under, or nothing readable to describe.
 *
 * Age alone is not one of them — but an unknown data story is, unless the
 * publisher fills the gap themselves. Publishing a page that cannot say where
 * a user's data goes is worse than publishing nothing.
 */
export function blockingProblems(derived, metadata = {}) {
  const problems = [...(derived.problems ?? [])];

  if (derived.dataHandling && derived.dataHandling.userDataLeavesDevice === null) {
    const declared = metadata.dataHandling;
    const declaredCompletely =
      declared && (declared.leavesDevice === false || Boolean(metadata.privacyUrl));
    if (!declaredCompletely) {
      problems.push(
        "data handling cannot be derived from a pre-3.6 manifest; the publisher must declare dataHandling (and a privacyUrl if anything leaves the device)",
      );
    }
  }

  return problems.filter(
    (problem) =>
      problem.includes("licence") ||
      problem.includes("could not be read") ||
      problem.includes("not a public github.com URL") ||
      problem.includes("manifest.json") ||
      problem.includes("data handling cannot be derived"),
  );
}
