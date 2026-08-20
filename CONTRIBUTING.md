# Contributing

Thanks for contributing to the Wealthfolio addon ecosystem.

There are two kinds of contribution to this repository, and only two.

## 1. Community directory listing

A directory listing makes your addon discoverable from
[wealthfolio.app/addons/community](https://wealthfolio.app/addons/community).
It is a link to your repository — Wealthfolio does not build, host, audit,
endorse, or support your addon, and users install it with **Install from File**.

Read [POLICIES.md](POLICIES.md) first: it defines what you confirm when you
submit, and what Wealthfolio does and does not do with your listing.

Required PR content — one file:

```text
community/directory/<addon-id>/addon.store.json
```

Start from:

```text
templates/community-directory-addon/addon.store.json
```

Your listing is short, because Wealthfolio verifies what it can rather than
asking you to retype it:

- `name`, `description` (plain text), `author` naming the **publisher**
- `repository` — public, HTTPS, on GitHub
- `tags`
- `commercialModel` — `free`, `paid`, `subscription`, or
  `external-service-required`

That last one is the only disclosure you have to make, because no repository
reveals what an addon costs. (`external-service-required` means the addon needs
an account somewhere else; it says nothing about whether that service is free.)

The pull request template contains the publisher attestation — that you are the
publisher, that you have the rights to what you submitted, and that nothing is
hidden. Fill it in; listings are not merged without it.

### What Wealthfolio derives, and what it blocks

`pnpm derive:community` reads your repository and records the result in
[`community/derived.json`](community/derived.json), with the commit it came
from. The website shows these as *derived*, attributed and dated — never as
your declaration.

| Derived | From |
| --- | --- |
| Licence | The SPDX licence GitHub detects in your repository |
| Data handling | Your manifest's `network` permission and `allowedHosts` |
| Compatibility | Your manifest's `sdkVersion` |
| Last updated | Your repository's last push |
| Standard notices | Your `tags`, via [`scripts/lib/notices.mjs`](scripts/lib/notices.mjs) |

Data handling is derived rather than declared because it is **enforced**: under
the 3.6+ sandbox an addon with no `network` permission cannot make outbound
requests at all. Direct browser requests are blocked and the broker refuses
undeclared hosts. That is a stronger statement than any promise in a JSON file.

A listing **cannot become `active`** while:

- the repository has no detectable licence — without one, users have no legal
  right to use your addon;
- there is no readable `manifest.json` at the repository root;
- the manifest's `sdkVersion` is below 3.0, which the current runtime cannot
  load.

A manifest built before SDK 3.6 is published with a caution rather than blocked.

If the manifest cannot express something users should know before installing —
a companion service, a feature that reads data from somewhere unusual — add the
optional `dataHandling` block and a `privacyUrl`. Anything sent off the device
needs both.

These declarations are informational. The permission dialog Wealthfolio shows
at install time is the authoritative permission surface.

## 2. Official addon source

Official addons are owned, built, distributed, and supported by Wealthfolio.
Their full source lives under `official/<addon-id>/`. Community submissions are
not accepted into this directory; publish your addon yourself and submit a
directory listing instead.

Official addon changes must update:

- `manifest.json`
- `addon.store.json`
- `CHANGELOG.md`
- tests or validation coverage when behaviour changes

## Metadata contracts

`manifest.json` is the runtime contract consumed by the app: addon id, display
name, version, SDK version, entrypoint, declared permissions, allowed network
hosts.

`addon.store.json` is the catalog contract: trust tier, lifecycle status,
category tags, publisher disclosures, release metadata, and — for official
addons only — the distribution key.

Do not put dynamic metrics such as downloads, rating, or review count in
`addon.store.json`. Those belong to the store service.

## Status values

| Status        | Meaning                                                        |
| ------------- | -------------------------------------------------------------- |
| `active`      | Published on the website                                        |
| `pending`     | Submitted, waiting on publisher confirmation; not published yet |
| `coming-soon` | Announced, not usable yet                                       |
| `deprecated`  | Still listed, with a warning; new installs discouraged          |
| `inactive`    | Hidden                                                          |

A `pending` listing may carry minimal metadata. An `active` listing must carry
the full disclosure set above.

## Local checks

```bash
pnpm install
pnpm test:schema
pnpm validate:addons
pnpm generate
```

Validation works offline against the committed `community/derived.json`. A
maintainer refreshes that file with `pnpm derive:community`, which is the only
step that talks to GitHub.

`pnpm generate` rewrites `community/README.md` and `official/README.md`; commit
the result, because CI fails on a diff.

For official addon source changes, also run:

```bash
pnpm type-check:official
pnpm bundle:official
```

If you are moving an addon from the old app repository layout, read
[docs/repository-migration.md](docs/repository-migration.md) first.

## Security expectations

- Do not include secrets in source, docs, manifests, or screenshots.
- Do not request permissions the addon does not use.
- Explain every permission in plain language.
- Avoid remote script loading and dynamic code execution.
- Declare `network.allowedHosts` for every host the addon reaches.
- Report vulnerabilities and malicious addons privately — see
  [SECURITY.md](SECURITY.md). Never in a public issue.

## Screenshots

Community listings do not need screenshots. Official addons use a wide
landscape WebP, stored in `media/` — **not** `assets/`:

```text
official/<addon-id>/media/cover-light.webp
official/<addon-id>/media/cover-dark.webp
```

`assets/` is bundled into the shipped addon zip and, from Wealthfolio 3.7,
indexed as runtime packaged assets. Store art belongs to the catalog, not to
the running addon, so it lives in `media/` and never reaches a user's install.

PNG is accepted; update `addon.store.json` to match the actual file names.
Validation reads the file signature, so an extension alone will not do: covers
must be a real PNG or WebP, at least 800px wide, landscape, and under 2 MiB.
SVG is not accepted. Both `coverLight` and `coverDark` are required for official
addons, and a declared file that is missing fails the build.

The catalog CDN serves these covers under **version-less** names, so a version
bump never breaks a listing's screenshot:

```text
https://assets.wealthfolio.app/images/addons/<addon-id>.webp
https://assets.wealthfolio.app/images/addons/<addon-id>-dark.webp
```

Re-upload a cover when the addon's interface actually changes, not on every
release.
