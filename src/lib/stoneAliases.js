/**
 * Stone alias / alternate trade name mapping.
 *
 * Different markets / clients know the same stone by different names.
 * When a user searches for an alias, we want them to find the canonical stone.
 *
 * FORMAT:
 *   "Canonical Stone Name (as in database)": ["Alias 1", "Alias 2", ...]
 *
 * MATCHING:
 * - Case-insensitive
 * - Whitespace-tolerant ("BiancoCiano" matches "Bianco Ciano")
 * - Used by the public catalog search + chatbot name extraction
 *
 * TO ADD A NEW MAPPING: just add an entry below and push. No DB changes needed.
 */
export const STONE_ALIASES = {
    // ── Example (replace with your real list) ──────────────────────────
    // "Angelo White": ["Bianco Ciano", "White Angel"],
    // "Calacatta Gold": ["Oro Calacatta", "Gold Vein Marble"],
    // ───────────────────────────────────────────────────────────────────
};

/**
 * Build a reverse lookup: alias (normalized) → canonical name.
 * Used to translate a user's search query into the canonical name.
 */
const _normalize = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

let _reverseCache = null;
const _getReverseMap = () => {
    if (_reverseCache) return _reverseCache;
    const map = new Map();
    for (const [canonical, aliases] of Object.entries(STONE_ALIASES)) {
        for (const alias of aliases) {
            map.set(_normalize(alias), canonical);
        }
    }
    _reverseCache = map;
    return map;
};

/**
 * Look up a canonical stone name from any alias.
 * Returns the canonical name if input matches an alias, else null.
 */
export const resolveAlias = (input) => {
    if (!input) return null;
    return _getReverseMap().get(_normalize(input)) || null;
};

/**
 * Get all aliases for a given canonical stone name (returns []  if none).
 * Case-insensitive lookup on canonical name.
 */
export const getAliases = (canonicalName) => {
    if (!canonicalName) return [];
    const want = _normalize(canonicalName);
    for (const [name, aliases] of Object.entries(STONE_ALIASES)) {
        if (_normalize(name) === want) return aliases;
    }
    return [];
};

/**
 * Enrich a list of stones with an `_aliases` field (array of alias strings).
 * Used by Fuse.js search so aliases are matched alongside the real name.
 */
export const enrichWithAliases = (stones) => {
    return stones.map(s => ({
        ...s,
        _aliases: getAliases(s.name)
    }));
};
