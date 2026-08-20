import path from "node:path";
import { existsSync, statSync } from "node:fs";
import { getAddonRecords, repoRoot } from "./lib/addon-records.mjs";
import { createStoreValidator, formatSchemaErrors } from "./lib/schema.mjs";
import { requiredNotices } from "./lib/notices.mjs";
import { downloadUrl, r2Key } from "./lib/distribution.mjs";

const MAX_MEDIA_BYTES = 2 * 1024 * 1024;
const ALLOWED_MEDIA_EXTENSIONS = new Set([".webp", ".png"]);

const records = await getAddonRecords();
const validateStore = await createStoreValidator();
const ids = new Map();
const errors = [];
const warnings = [];

function validateContributedRoutes(record, manifest) {
  const routes = manifest.contributes?.routes;
  if (routes === undefined) {
    return;
  }

  const routePaths = new Set();
  if (!Array.isArray(routes)) {
    errors.push(`${record.relativePath}: manifest contributes.routes must be an array`);
    return;
  }

  routes.forEach((route, index) => {
    const prefix = `${record.relativePath}: manifest contributes.routes[${index}]`;
    if (!route || typeof route !== "object") {
      errors.push(`${prefix} must be an object`);
      return;
    }

    const routePath = route.path ?? "";
    if (typeof routePath !== "string") {
      errors.push(`${prefix}.path must be a string when present`);
      return;
    }

    const hasUnsafeSegment =
      routePath !== "" &&
      routePath.split("/").some((segment) => !segment || segment === "." || segment === "..");
    if (
      routePath !== routePath.trim() ||
      routePath.startsWith("/") ||
      /[\\?#%]/.test(routePath) ||
      hasUnsafeSegment
    ) {
      errors.push(
        `${prefix}.path must be relative to /addons/<addon-id> without traversal, escapes, queries, or fragments`,
      );
    }

    const normalizedPath = routePath.toLowerCase();
    if (routePaths.has(normalizedPath)) {
      errors.push(`${prefix}.path duplicates route path "${routePath}"`);
    }
    routePaths.add(normalizedPath);
  });
}

function validateDistribution(record) {
  const { metadata } = record;
  const version = metadata.release?.version;
  if (!version || !metadata.distribution) {
    return;
  }

  const expectedKey = r2Key(metadata.id, version);
  if (metadata.distribution.r2Path !== expectedKey) {
    errors.push(
      `${record.relativePath}: distribution.r2Path must be "${expectedKey}" (derived from id and release version), got "${metadata.distribution.r2Path}"`,
    );
  }

  const expectedUrl = downloadUrl(metadata.id, version);
  if (metadata.distribution.downloadUrl && metadata.distribution.downloadUrl !== expectedUrl) {
    errors.push(
      `${record.relativePath}: distribution.downloadUrl must be "${expectedUrl}", got "${metadata.distribution.downloadUrl}"`,
    );
  }
}

function validateNotices(record) {
  const { metadata } = record;
  if (metadata.trust !== "community" || metadata.status !== "active") {
    return;
  }

  const declared = new Set(metadata.notices ?? []);
  for (const notice of requiredNotices(metadata.tags)) {
    if (!declared.has(notice)) {
      errors.push(
        `${record.relativePath}: tags require the "${notice}" notice; add it to "notices"`,
      );
    }
  }
}

function validateMedia(record) {
  const { metadata } = record;

  for (const [field, imagePath] of Object.entries(metadata.media ?? {})) {
    const prefix = `${record.relativePath}: media.${field}`;

    if (path.isAbsolute(imagePath) || imagePath.split("/").includes("..")) {
      errors.push(`${prefix} must be a path inside the addon directory`);
      continue;
    }

    const extension = path.extname(imagePath).toLowerCase();
    if (!ALLOWED_MEDIA_EXTENSIONS.has(extension)) {
      errors.push(`${prefix} must be a .webp or .png file, got "${extension || imagePath}"`);
      continue;
    }

    const absolutePath = path.join(record.addonDir, imagePath);
    if (!existsSync(absolutePath)) {
      warnings.push(`${prefix} file is not present yet: ${imagePath}`);
      continue;
    }

    if (statSync(absolutePath).size > MAX_MEDIA_BYTES) {
      errors.push(`${prefix} exceeds ${MAX_MEDIA_BYTES / 1024 / 1024} MiB`);
    }
  }
}

function validateBranding(record) {
  const { metadata } = record;
  if (metadata.trust !== "community") {
    return;
  }

  const name = metadata.name ?? "";
  if (/^wealthfolio\b/i.test(name)) {
    warnings.push(
      `${record.relativePath}: community addon name starts with "Wealthfolio"; confirm it does not imply an official addon (see TRADEMARKS policy)`,
    );
  }
}

for (const record of records) {
  const { metadata, manifest, packageJson } = record;

  if (!validateStore(metadata)) {
    errors.push(...formatSchemaErrors(record.relativePath, validateStore.errors));
  }

  if (ids.has(metadata.id)) {
    errors.push(
      `${record.relativePath}: duplicate id "${metadata.id}" also used by ${ids.get(metadata.id)}`,
    );
  } else {
    ids.set(metadata.id, record.relativePath);
  }

  const expectedDir = metadata.trust === "official" ? "official" : "community/directory";
  if (!record.relativeDir.startsWith(`${expectedDir}/`)) {
    errors.push(`${record.relativePath}: ${metadata.trust} addons must live under ${expectedDir}/`);
  }

  if (path.basename(record.addonDir) !== metadata.id) {
    errors.push(
      `${record.relativePath}: directory name must match the addon id "${metadata.id}"`,
    );
  }

  if (metadata.trust === "official") {
    if (!manifest) {
      errors.push(`${record.relativePath}: official addons must include manifest.json`);
    }

    if (!packageJson) {
      errors.push(`${record.relativePath}: official addons must include package.json`);
    }
  }

  validateDistribution(record);
  validateNotices(record);
  validateMedia(record);
  validateBranding(record);

  if (manifest) {
    if (manifest.id !== metadata.id) {
      errors.push(
        `${record.relativePath}: manifest id "${manifest.id}" does not match store id "${metadata.id}"`,
      );
    }

    if (metadata.release?.version && manifest.version !== metadata.release.version) {
      errors.push(
        `${record.relativePath}: manifest version "${manifest.version}" does not match release version "${metadata.release.version}"`,
      );
    }

    if (metadata.release?.sdkVersion && manifest.sdkVersion !== metadata.release.sdkVersion) {
      errors.push(
        `${record.relativePath}: manifest sdkVersion "${manifest.sdkVersion}" does not match release sdkVersion "${metadata.release.sdkVersion}"`,
      );
    }

    if (
      metadata.release?.minWealthfolioVersion &&
      manifest.minWealthfolioVersion !== metadata.release.minWealthfolioVersion
    ) {
      errors.push(
        `${record.relativePath}: manifest minWealthfolioVersion "${manifest.minWealthfolioVersion}" does not match release minWealthfolioVersion "${metadata.release.minWealthfolioVersion}"`,
      );
    }

    validateContributedRoutes(record, manifest);
  }

  if (packageJson) {
    if (manifest?.version && packageJson.version !== manifest.version) {
      errors.push(
        `${record.relativePath}: package version "${packageJson.version}" does not match manifest version "${manifest.version}"`,
      );
    }

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
      ...packageJson.peerDependencies,
    };

    for (const [name, version] of Object.entries(allDeps)) {
      if (version === "workspace:*") {
        errors.push(`${record.relativePath}: ${name} still uses workspace:*`);
      }
    }
  }
}

if (warnings.length) {
  console.warn(warnings.map((warning) => `warning: ${warning}`).join("\n"));
}

if (errors.length) {
  console.error(errors.map((error) => `error: ${error}`).join("\n"));
  process.exit(1);
}

console.log(`Validated ${records.length} addon records in ${repoRoot}`);
