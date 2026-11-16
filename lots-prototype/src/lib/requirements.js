// A buyer's requirement: the space, how much stone it needs, and the stone in
// mind (no budget since 2026-11-15). Used by the "Share your requirement" sheet;
// the gallery's budget filter uses the same job price (jobCost).
import { costFor, SPACES, suitsSpace } from './lots';

// Budget steps for the slider: dense where most small jobs sit.
export const BUDGET_STEPS = [3000, 5000, 7500, 10000, 15000, 20000, 25000, 35000, 50000, 75000, 100000, 150000, 200000, 300000];

// Budget choices for the gallery filter.
export const BUDGET_FILTERS = [10000, 25000, 50000, 100000, 200000];

/** What this lot costs for a job of `sqft`: part-lot rate, or the whole lot when that is cheaper (lots.js). */
export const jobCost = costFor;

// Colours a buyer can pick when they don't know the stone's name, grouped from
// the catalogue's colour tags (`stones.color`: White, Beige, Grey, …).
export const COLOUR_GROUPS = [
    { id: 'white', label: 'White', hex: '#F4F2EC', tags: ['White'] },
    { id: 'cream', label: 'Cream or beige', hex: '#E3D3B4', tags: ['Cream', 'Beige'] },
    { id: 'grey', label: 'Grey', hex: '#9C9C99', tags: ['Grey', 'Silver'] },
    { id: 'black', label: 'Black', hex: '#1F1E1C', tags: ['Black'] },
    { id: 'brown', label: 'Brown', hex: '#7A5236', tags: ['Brown'] },
    { id: 'gold', label: 'Gold or yellow', hex: '#C9A24A', tags: ['Golden', 'Yellow'] },
    { id: 'green', label: 'Green', hex: '#4F7A5A', tags: ['Green'] },
    { id: 'blue', label: 'Blue', hex: '#3D5F8C', tags: ['Blue'] },
    { id: 'pink', label: 'Pink or red', hex: '#D49A92', tags: ['Pink', 'Red', 'Peach'] },
];

const norm = (s) =>
    String(s || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();

/** Lots in stock whose name contains what the buyer typed (3 letters or more). */
export const lotsNamed = (lots, name) => {
    const q = norm(name);
    return q.length < 3 ? [] : lots.filter((l) => norm(l.name).includes(q));
};

/**
 * Lots that can do the job within budget: enough stone, a stone that suits the
 * space, at or under budget for the job's size, and the stone type wanted
 * (if any). Cheapest for the job first.
 *
 * `colours`: COLOUR_GROUPS ids; a lot fits if any of its colours is in one.
 * `ids`: only these lots (the ones named by the buyer), when given.
 */
export function matchLots(lots, { spaceId, sqft, budget, families = [], colours = [], ids = null }) {
    const space = SPACES.find((s) => s.id === spaceId);
    const need = Math.max(1, Number(sqft) || space?.sqft || 1);
    const tags = COLOUR_GROUPS.filter((g) => colours.includes(g.id)).flatMap((g) => g.tags);
    return lots
        .filter((l) => !ids || ids.has(l.id))
        .filter((l) => l.sqft >= need)
        .filter((l) => !space || suitsSpace(l, space))
        .filter((l) => !families.length || families.includes(l.family))
        .filter((l) => !tags.length || l.colors.some((c) => tags.includes(c)))
        .filter((l) => !budget || jobCost(l, need) <= budget)
        .sort((a, b) => a.price - b.price || b.discountPct - a.discountPct);
}

/** The cheapest this job can be done for right now, ignoring the budget. */
export function cheapestFor(lots, req) {
    const all = matchLots(lots, { ...req, budget: 0 });
    const need = Math.max(1, Number(req.sqft) || 1);
    return all.length ? jobCost(all[0], need) : null;
}
