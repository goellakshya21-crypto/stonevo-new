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
 * - Canonical-name matching is CONTAINS-based, so "Bianco Lasa Classic" covers
 *   any DB row whose name contains that string (e.g. "Bianco Lasa Classic 6").
 *
 * TO ADD A NEW MAPPING: just add an entry below and push. No DB changes needed.
 */
export const STONE_ALIASES = {
    // ── Single-canonical mappings ─────────────────────────────────────
    "Silver Nuvolato":       ["Chianti"],
    "Bianco Lumina":         ["Monte Pulichano"],
    "Golden Spider":         ["Bianco Eliptus"],
    "Crystal White":         ["Namibian White"],
    "Macedonia White":       ["Pantheon"],
    "Thassos Select":        ["Thassos Novelato"],
    "Bianco Dune":           ["Covilano", "Lasa Covilano"],
    "White Seraph":          ["Affilato"],
    "Bianco Lasa":           ["Lasa"],
    "Ice White":             ["Bianco Moronus"],
    "Silk Carrara":          ["Bianco Reale"],
    "Albastar Flow":         ["Picasso Ardent"],

    // ── Multi-canonical aliases (shared aliases that map to several stones) ──
    // "Volakas" → Angelo White, Velora White, Brown Statuario  (3 different stones share this alias)
    "Angelo White":          ["Bianco Voque", "Volakas"],
    "Velora White":          ["Pirgon", "Volakas"],
    "Brown Statuario":       ["Volakas", "Acropolis Grano", "Bianco Acropolis"],

    // "Dior Pearl" → 3 Vietnam White variants (and typo "Vientnam" tolerance)
    "Vietnam White Select":  ["Flawless White", "Dior Pearl", "Vientnam White Select"],
    "Vietnam White Classic": ["Dior Pearl"],
    "Vietnam White Elite":   ["Dior Pearl", "Newzealand Bianco"],

    // "Callacata" → Callacata Gold AND Paonazzo
    "Callacata Gold":        ["Pianazo", "Statuario Gold", "Callacata", "Golden Statuarion"],
    "Paonazzo":              ["Callacata", "Callacata Gold"],

    // "Michel Angelo" → 4 family variants (covers numbered variants via contains-match)
    "Peach Michel Angelo":    ["Michel Angelo"],
    "Michel Angelo Classic":  ["Michel Angelo"],
    "Michel Angelo Select":   ["Michel Angelo"],
    "Michel Angelo Elite":    ["Michel Angelo"],

    // "Statuario" → 4 Statuario family variants
    "Statuario Classic":     ["Statuario"],
    "Statuario Select":      ["Statuario"],
    "Statuario Elite":       ["Statuario"],
    "Statuario Light":       ["Statuario"],

    // "Bianco Lasa" series — covers DB names containing these prefixes
    "Bianco Lasa Classic":   ["Bianco Lasa"],
    "Bianco Lasa Select":    ["Bianco Lasa"],
    "Bianco Lasa Elite":     ["Bianco Lasa"],
};

// ── Internal helpers ─────────────────────────────────────────────────
const _normalize = (s) => (s || '').toString().toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * Reverse lookup: alias (normalized) → canonical name.
 * If an alias maps to multiple canonicals, returns the FIRST one (deterministic).
 * For multi-canonical aliases the Fuse `_aliases` enrichment handles full coverage.
 */
let _reverseCache = null;
const _getReverseMap = () => {
    if (_reverseCache) return _reverseCache;
    const map = new Map();
    for (const [canonical, aliases] of Object.entries(STONE_ALIASES)) {
        for (const alias of aliases) {
            const key = _normalize(alias);
            if (!map.has(key)) map.set(key, canonical); // first wins
        }
    }
    _reverseCache = map;
    return map;
};

/**
 * Look up a canonical stone name from any alias.
 * Returns the canonical name if input matches an alias, else null.
 * For 1:many aliases, returns the first canonical (rely on enrichWithAliases for full set).
 */
export const resolveAlias = (input) => {
    if (!input) return null;
    return _getReverseMap().get(_normalize(input)) || null;
};

/**
 * Get all aliases applicable to a given stone name.
 * Uses CONTAINS matching so "Bianco Lasa Classic" canonical covers
 * DB stones like "Bianco Lasa Classic 6", "Bianco Lasa Classic 3", etc.
 */
export const getAliases = (stoneName) => {
    if (!stoneName) return [];
    const want = _normalize(stoneName);
    const collected = new Set();
    for (const [canonical, aliases] of Object.entries(STONE_ALIASES)) {
        const c = _normalize(canonical);
        if (want === c || want.includes(c)) {
            for (const a of aliases) collected.add(a);
        }
    }
    return Array.from(collected);
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
