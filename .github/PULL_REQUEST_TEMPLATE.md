<!--
Adding or updating a community directory listing? Fill in everything below.
Changing an official addon instead? Delete this template and describe the change.
-->

## Listing

- Addon id:
- Repository:
- Publisher (person or organisation responsible for the addon):

## What changed

<!-- New listing, metadata update, or removal. One or two sentences. -->

## Publisher attestation

I have read [POLICIES.md](https://github.com/wealthfolio/wealthfolio-addons/blob/main/POLICIES.md) and confirm:

- [ ] I am the publisher of this addon, or I am expressly authorised to act for
      the publisher. The `author` field names the publisher, not just my GitHub
      account.
- [ ] I have the rights to the name, description, logo, and screenshots I
      submitted, and I grant Wealthfolio permission to display them for this
      listing.
- [ ] The source repository is public and licensed under the SPDX licence I
      declared in `license`.
- [ ] Everything I declared is accurate — features, compatibility, external
      services, and what happens to user data.
- [ ] There is no hidden data collection and no undisclosed remote code. Every
      service that receives user data is listed in
      `dataHandling.externalServices`, and `dataHandling.leavesDevice` is `true`
      if anything leaves the device (with a `privacyUrl`).
- [ ] I am responsible for support, updates, security fixes, privacy compliance,
      licensing, and any commercial terms for this addon.
- [ ] The name and branding do not imply the addon is official, endorsed, or
      affiliated with Wealthfolio.
- [ ] I understand a listing is a link only: Wealthfolio does not host, build,
      audit, endorse, or support this addon, and may remove the listing at its
      discretion.

## Metadata checklist

- [ ] File is at `community/directory/<addon-id>/addon.store.json`, and the
      directory name matches the `id`.
- [ ] `license`, `supportUrl`, `minWealthfolioVersion`, `commercialModel`,
      `dataHandling`, and `notices` are filled in.
- [ ] `notices` includes every notice required by the addon's `tags`
      (tax → `not-tax-advice`, strategy/rebalancing → `not-investment-advice`,
      planning/projections → `not-financial-advice`).
- [ ] All URLs are HTTPS and resolve.
- [ ] `pnpm validate:addons` and `pnpm generate` pass locally with no diff.

<!--
Do not report a vulnerability, a malicious addon, or an IP complaint here.
Email hello@wealthfolio.app — see SECURITY.md.
-->
