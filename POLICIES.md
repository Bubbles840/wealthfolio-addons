# Addon Directory Policies

These are the rules for listing a community addon in this repository and on
[wealthfolio.app/addons/community](https://wealthfolio.app/addons/community).
They are written in plain language so that submitters and maintainers read the
same thing. Wealthfolio is a product of Teymz Inc.

## What a community listing is

A community listing is a **link**. It tells people your addon exists and where
to get it.

- Wealthfolio does **not** host, build, sign, or distribute your package.
- Wealthfolio does **not** perform a comprehensive code or security audit.
- Wealthfolio does **not** endorse, support, or guarantee your addon.
- A listing is **not** a certification, a compatibility guarantee, or a
  statement that the addon is safe.

Wealthfolio validates the submitted listing metadata, and may carry out
risk-based internal moderation. Neither produces a public badge, and neither is
a review of your code.

Users download your package from your repository and install it with
**Install from File** in Wealthfolio. That flow shows the permissions your
addon requests, and the app's install dialog — not this listing — is the
authoritative permission surface.

## What you confirm when you submit

By opening a pull request that adds or changes a listing, you confirm that:

1. **You are the publisher**, or you are expressly authorised to act for the
   publisher. The `author` field names the publisher who is responsible for the
   addon — not merely the GitHub account that opened the pull request.
2. **You have the rights** to everything you submit, and the listing infringes
   nobody's copyright, trademark, or other rights.
3. **You grant Wealthfolio permission** to reproduce, resize, and display the
   name, description, logo, and screenshots you submit, in order to show the
   listing on the website and in Wealthfolio's own materials.
4. **The source repository is public and clearly licensed** under the OSI/SPDX
   licence you declared in `license`.
5. **Your claims are accurate** — features, the Wealthfolio versions you
   declare compatibility with, external services, and what happens to user data.
6. **There is no hidden data collection and no undisclosed remote code.** Every
   external service that receives user data is declared in
   `dataHandling.externalServices`, and anything that leaves the device is
   declared with `dataHandling.leavesDevice: true` plus a privacy policy URL.
7. **You own the addon**: support, updates, security fixes, privacy compliance,
   licensing, commercial terms, refunds, and any dispute with a user are yours,
   not Wealthfolio's.
8. **You keep the listing current.** If the addon is abandoned, moves, or stops
   working, open a pull request to update or remove the entry.

Wealthfolio may refuse, hide, or remove any listing at its discretion, with or
without notice.

## Naming and branding

Follow the [Wealthfolio trademark policy](https://github.com/wealthfolio/wealthfolio/blob/main/TRADEMARKS.md).

- Do not use a name, logo, domain, or description that implies your addon is
  official, endorsed, certified, or affiliated.
- Descriptive references are fine: "for Wealthfolio", "Wealthfolio-compatible".
- Do not use the Wealthfolio logo or wordmark as your addon's own icon.

## Required metadata

Every listing that appears publicly (`"status": "active"`) declares:

| Field | Meaning |
| --- | --- |
| `license` | SPDX identifier of the published source licence |
| `repository` | Public source repository (HTTPS) |
| `supportUrl` | Where users report problems to **you** |
| `minWealthfolioVersion` | Lowest Wealthfolio version you declare support for |
| `commercialModel` | `free`, `paid`, `subscription`, or `external-service-required` |
| `dataHandling.leavesDevice` | `true` if any data leaves the user's device, for any reason |
| `dataHandling.dataTypes` | What portfolio data the addon reads |
| `dataHandling.externalServices` | Every third-party service that receives data |
| `privacyUrl` | Required whenever `leavesDevice` is `true` |
| `notices` | Standard notices for the addon's category |

`external-service-required` means the addon needs an account or API somewhere
else. It does not say whether that service is free.

Entries submitted without this information stay `"status": "pending"` and are
not published on the website until the publisher confirms them.

## Standard notices

Some categories always carry a notice. You choose from the list; the website
renders the wording, so publishers never write their own disclaimer copy.

| Notice | Applies to |
| --- | --- |
| `not-tax-advice` | Tax, capital gains, wealth tax, tax reporting |
| `not-investment-advice` | Rebalancing, allocation, strategy, screening, trading |
| `not-financial-advice` | Financial planning, projections, retirement, forecasts |

Continuous integration enforces the mapping from your `tags`, so a tax addon
cannot be published without the tax notice.

## What gets a listing removed

Wealthfolio may hide or remove a listing when it receives a credible, specific
report — or notices on its own — that the addon:

- behaves maliciously, exfiltrates data, or does something it did not declare;
- infringes someone's rights;
- misrepresents its publisher, its affiliation, or what it does;
- has been abandoned, or its repository has disappeared;
- collects data in a way that contradicts its declared `dataHandling`.

Reports go to **hello@wealthfolio.app** (see [SECURITY.md](SECURITY.md)), not to
a public issue. Hiding a listing is a precaution, not a finding: Wealthfolio
does not promise to investigate, adjudicate, or reinstate, and it records its
own reason internally whenever it hides one.

## Payments

Wealthfolio does not process payments for community addons, takes no commission,
and does not sell placement in the directory. Anything a publisher charges is
strictly between the publisher and the user.

## Official addons

Official addons are a separate channel. They are built, distributed, and
supported by Wealthfolio, live under `official/`, and are the only addons
installable directly from within the app. Submitting an addon for inclusion as
an official addon is not something this directory process covers.
