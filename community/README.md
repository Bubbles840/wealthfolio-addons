# Community Addons

Community addons are independently published. Wealthfolio does not build, host,
audit, endorse, or support them. This directory is a discovery listing: the
package is downloaded from the publisher's own repository and installed with
**Install from File** in Wealthfolio.

Listing requirements and the publisher attestation are in
[POLICIES.md](../POLICIES.md).

| Addon | Publisher | Status | Licence | Runtime | Repo |
| --- | --- | --- | --- | --- | --- |
| Asset Amount & Cash Timeline | bryanrvo1511 | active | MIT | pre-3.6 SDK | [Repo](https://github.com/bryanrvo/Asset-amount-Cash-Timeline-add-on) |
| Dividends Importer | kwaich | pending | none | current SDK | [Repo](https://github.com/kwaich/dividend-tracker) |
| Wealthfolio Dividend Tracker | ragnarok896209 | pending | none | pre-3.6 SDK | [Repo](https://github.com/ragnarok-89/Wealthfolio-Dividend-Tracker) |
| Lunch Money Addon | elson8012 | active | MIT | pre-3.6 SDK | [Repo](https://github.com/elson/lunchmoney-addon) |
| Wealthfolio Rebalancer | ibalboteo | pending | none | current SDK | [Repo](https://github.com/ibalboteo/wealthfolio-rebalancer) |
| Value Averaging Addon | wujoe | active | MIT | pre-3.6 SDK | [Repo](https://github.com/WuJoe826/Value-Averaging-Addon) |

Licence and runtime are **derived** from each publisher's repository, not
declared here — see [community/derived.json](derived.json), refreshed with
`pnpm derive:community`. Only `active` entries appear on
[wealthfolio.app/addons/community](https://wealthfolio.app/addons/community); a
listing cannot become active while its repository has no licence or its addon
cannot load on the current runtime.
