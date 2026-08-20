/**
 * Derivation regression tests.
 *
 * These cover the paths that read a publisher's manifest — untrusted input that
 * decides whether Wealthfolio tells users an addon keeps their data local. They
 * run offline: the network half of derivation is exercised against real
 * repositories by `pnpm derive:community`.
 */
import {
  blockingProblems,
  checkManifestStructure,
  deriveCompatibility,
  deriveDataHandling,
} from "./lib/derive.mjs";

const failures = [];

function expect(name, condition, detail = "") {
  if (condition) return;
  failures.push(`${name}${detail ? `: ${detail}` : ""}`);
}

// --- version parsing decides who gets the sandbox guarantee -----------------
const versionCases = [
  ["3.6.2", "current"],
  ["3.6", "current"],
  ["3.7.0", "current"],
  ["3.6.2-beta.1", "current"],
  ["3.5.9", "predates-sandbox"],
  ["2.0.0", "predates-sandbox"],
  ["3.6evil", "unknown"],
  ["3.6 (fork)", "unknown"],
  ["3.x", "unknown"],
  ["", "unknown"],
  [undefined, "unknown"],
  ["not-a-version", "unknown"],
];

for (const [sdkVersion, expected] of versionCases) {
  const state = deriveCompatibility({ sdkVersion }).state;
  expect(
    `sdkVersion ${JSON.stringify(sdkVersion)} is ${expected}`,
    state === expected,
    `got ${state}`,
  );
}

// --- the guarantee is never extended to a version we could not read ---------
for (const sdkVersion of ["3.6evil", "3.x", undefined]) {
  const compatibility = deriveCompatibility({ sdkVersion });
  const handling = deriveDataHandling({ permissions: [], sdkVersion }, compatibility);
  expect(
    `no egress claim for sdkVersion ${JSON.stringify(sdkVersion)}`,
    handling.userDataLeavesDevice === null,
    `claimed ${handling.userDataLeavesDevice}`,
  );
  expect(
    `basis for ${JSON.stringify(sdkVersion)} does not claim a sandbox build`,
    !/Built before the 3\.6 sandbox/.test(handling.basis),
    handling.basis,
  );
}

// --- a sandbox-era addon with no network permission is genuinely constrained -
{
  const manifest = { permissions: [], sdkVersion: "3.7.0" };
  const handling = deriveDataHandling(manifest, deriveCompatibility(manifest));
  expect("sandboxed addon reports no egress", handling.userDataLeavesDevice === false);
}

{
  const manifest = {
    sdkVersion: "3.7.0",
    permissions: [{ category: "network" }],
    network: { allowedHosts: ["api.example.com", "", 42] },
  };
  const handling = deriveDataHandling(manifest, deriveCompatibility(manifest));
  expect("declared hosts are reported", handling.userDataLeavesDevice === true);
  expect(
    "non-string hosts are discarded",
    handling.externalServices.length === 1 && handling.externalServices[0].host === "api.example.com",
    JSON.stringify(handling.externalServices),
  );
}

// --- malformed manifests block the listing, they do not crash the run -------
const structureCases = [
  ["permissions not a list", { permissions: "all" }, "permissions that are not a list"],
  ["allowedHosts not a list", { network: { allowedHosts: "*" } }, "allowedHosts that are not a list"],
  ["network not an object", { network: "yes" }, "network block that is not an object"],
  ["manifest is an array", [], "not an object"],
  ["manifest is a string", "nope", "not an object"],
];

for (const [label, manifest, expectedFragment] of structureCases) {
  let result;
  try {
    result = checkManifestStructure(manifest);
  } catch (error) {
    expect(label, false, `threw ${error.message}`);
    continue;
  }
  expect(`${label} yields no usable manifest`, result.manifest === null);
  expect(
    `${label} explains itself`,
    result.problems.some((problem) => problem.includes(expectedFragment)),
    JSON.stringify(result.problems),
  );
  expect(
    `${label} blocks publication`,
    blockingProblems({ problems: result.problems }).length > 0,
  );
}

expect("a sound manifest passes through", checkManifestStructure({ id: "x" }).manifest !== null);
expect("a missing manifest is not an error here", checkManifestStructure(null).problems.length === 0);

// --- publisher declarations satisfy the pre-sandbox gate --------------------
{
  const derived = { problems: [], dataHandling: { userDataLeavesDevice: null } };
  expect(
    "undeclared pre-sandbox listing is blocked",
    blockingProblems(derived, {}).length === 1,
  );
  expect(
    "local-only declaration unblocks it",
    blockingProblems(derived, { dataHandling: { leavesDevice: false } }).length === 0,
  );
  expect(
    "egress declaration needs a privacy policy",
    blockingProblems(derived, { dataHandling: { leavesDevice: true } }).length === 1,
  );
  expect(
    "egress declaration with a privacy policy is enough",
    blockingProblems(derived, {
      dataHandling: { leavesDevice: true },
      privacyUrl: "https://example.com/privacy",
    }).length === 0,
  );
}

if (failures.length) {
  console.error(failures.map((failure) => `FAIL ${failure}`).join("\n"));
  process.exit(1);
}

console.log("Derivation tests passed");
