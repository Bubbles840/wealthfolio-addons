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

Your listing needs all of this before it can be published:

- `name`, `description` (plain text), `author` naming the **publisher**
- `repository` — public, HTTPS
- `supportUrl` — where users report problems to you
- `license` — SPDX identifier matching the licence in your repository
- `minWealthfolioVersion` — the lowest version you declare support for
- `commercialModel` — `free`, `paid`, `subscription`, or
  `external-service-required`
- `dataHandling` — see below
- `notices` — the standard notices your category requires

The pull request template contains the publisher attestation. Fill it in;
listings are not merged without it.

### Declaring data handling

```json
{
  "dataHandling": {
    "leavesDevice": false,
    "dataTypes": ["holdings", "transactions"],
    "externalServices": []
  }
}
```

If **anything** leaves the user's device — an API call, a webhook, telemetry,
an import from a third-party service — then `leavesDevice` is `true`, every
recipient goes in `externalServices`, and you must provide a `privacyUrl`:

```json
{
  "privacyUrl": "https://example.com/privacy",
  "dataHandling": {
    "leavesDevice": true,
    "dataTypes": ["accounts", "account-balances", "transactions"],
    "externalServices": [{ "name": "Example Sync", "url": "https://example.com" }]
  }
}
```

These declarations are informational. The permission dialog Wealthfolio shows
at install time is the authoritative permission surface.

### Standard notices

Pick from the fixed list; the website renders the wording.

| Notice | Required for tags such as |
| --- | --- |
| `not-tax-advice` | `tax`, `taxes`, `cgt`, `capital-gains`, `wealth-tax` |
| `not-investment-advice` | `rebalancing`, `strategy`, `allocation`, `trading`, `screener` |
| `not-financial-advice` | `planning`, `projections`, `retirement`, `forecast` |

The full mapping lives in [`scripts/lib/notices.mjs`](scripts/lib/notices.mjs)
and is enforced in CI.

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
