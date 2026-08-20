/**
 * Standard notices rendered by the website.
 *
 * Publishers pick from this list; they never write custom disclaimer copy, and
 * the copy itself lives on the website so it can be corrected in one place.
 */
export const NOTICES = ["not-tax-advice", "not-investment-advice", "not-financial-advice"];

/**
 * Tags that make a notice mandatory. Applied to community directory entries so
 * that a tax or strategy addon always carries the matching notice, regardless
 * of when it was submitted.
 */
export const NOTICE_BY_TAG = {
  tax: "not-tax-advice",
  taxes: "not-tax-advice",
  taxation: "not-tax-advice",
  cgt: "not-tax-advice",
  "capital-gains": "not-tax-advice",
  "wealth-tax": "not-tax-advice",

  rebalancing: "not-investment-advice",
  rebalance: "not-investment-advice",
  strategy: "not-investment-advice",
  "value-averaging": "not-investment-advice",
  "dollar-cost-averaging": "not-investment-advice",
  allocation: "not-investment-advice",
  "asset-allocation": "not-investment-advice",
  trading: "not-investment-advice",
  screener: "not-investment-advice",

  planning: "not-financial-advice",
  projections: "not-financial-advice",
  forecast: "not-financial-advice",
  retirement: "not-financial-advice",
  fire: "not-financial-advice",
};

/** Notices required by an addon's tags. */
export function requiredNotices(tags) {
  const required = new Set();
  for (const tag of tags ?? []) {
    const notice = NOTICE_BY_TAG[tag];
    if (notice) required.add(notice);
  }
  return [...required].sort();
}
