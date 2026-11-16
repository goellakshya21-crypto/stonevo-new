// Every place a small lot can go, in one list.
//
// Each entry is a ROOM the live visualiser renders (roomType + application are
// its own vocabulary) and a SPACE a buyer shops for (sqft is the stone that
// surface needs, cutting allowance included, and it is what the price uses).
//
// The rooms are deliberately COMPACT. Left to "Luxury Living Room" or "Grand
// Lobby" the model draws several times the stone a small lot holds, and the
// price beside the picture would be a lie. The size is stated in the room type
// so the picture matches the square feet we charge for.
//
// Wording traps in the live visualiser (src/lib/aiVisualizer.js): a room type
// containing "entrance", "balcony", "exterior" or "facade" switches it to an
// OUTDOOR shot. The foyer below avoids "entrance" for that reason; the balcony
// uses it on purpose.
//
// `slabs` follows the live modal's defaults: walls and floors get a 2 × 2
// bookmatch, counters, tables and stairs a single slab.

// Which stone can go where, by family. Every view follows these (lot pages,
// Shop by space, the gallery's space filter, requirements, compare, your room,
// Design a room, the hero), and a yard sees them when it lists a lot.

// Soft or translucent stones that scratch and etch underfoot.
const NOT_UNDERFOOT = ['Onyx', 'Semi-precious'];

// Kitchen counters (decided 2026-11-14): marble and the stones like it etch and
// stain with lemon, turmeric, tea and oil every day, so a kitchen counter is
// granite only (quartzite is grouped with granite). Onyx is softer still and
// translucent; travertine and dolomite are calcite stones like marble;
// sandstone soaks up everything; semi-precious slabs are resin-backed and
// scorch under a hot pan.
export const NOT_FOR_KITCHEN = ['Marble', 'Onyx', 'Travertine', 'Dolomite', 'Sandstone', 'Semi-precious'];

/** Why a family cannot go on a surface, in a few words for buyers and yards. */
export const whyNot = (family, sceneOrSurfaceId) => {
    const f = family.toLowerCase();
    if (sceneOrSurfaceId === 'kitchen' || sceneOrSurfaceId === 'counter')
        return family === 'Sandstone' ? 'sandstone soaks up kitchen spills' : family === 'Semi-precious' ? 'resin-backed slabs scorch under hot pans' : `${f} etches and stains in a kitchen`;
    if (sceneOrSurfaceId === 'balcony') return `${f} is not for outdoors`;
    if (NOT_UNDERFOOT.includes(family)) return `${f} is too soft to walk on`;
    return `not for ${f}`;
};

export const SCENES = {
    bathroom: {
        label: 'Bathroom',
        group: 'Bathroom',
        surface: 'Feature wall',
        space: 'Bathroom wall',
        hint: '6 × 8 ft behind the vanity',
        sqft: 48,
        roomType: 'compact high-end bathroom, about 6 by 8 feet, with a wall-hung vanity',
        application: 'single Feature Wall behind the vanity, about 6 feet wide',
        slabs: 4,
    },
    floor: {
        label: 'Bathroom floor',
        group: 'Bathroom',
        surface: 'Floor',
        space: 'Bathroom floor',
        hint: 'A 5 × 8 ft floor',
        sqft: 40,
        roomType: 'compact high-end bathroom, about 5 by 8 feet',
        application: 'Flooring',
        slabs: 4,
        avoid: NOT_UNDERFOOT,
    },
    vanity: {
        label: 'Powder room',
        group: 'Bathroom',
        surface: 'Vanity top',
        space: 'Vanity top',
        hint: 'A 2 × 4 ft counter',
        sqft: 9,
        roomType: 'compact high-end powder room',
        application: 'Vanity Counter Top, about 4 feet long',
        slabs: 1,
    },
    kitchen: {
        label: 'Kitchen',
        group: 'Kitchen & dining',
        surface: 'Counter and backsplash',
        space: 'Kitchen counter',
        hint: '10 ft run with backsplash',
        sqft: 32,
        avoid: NOT_FOR_KITCHEN,
        roomType: 'compact modern Indian apartment kitchen with one straight counter run and no island',
        application: 'Counter Top and backsplash along one wall, about 10 feet long',
        slabs: 1,
    },
    dining: {
        // The application is the table; sentences still say "in a dining room".
        label: 'Dining table',
        place: 'dining room',
        group: 'Kitchen & dining',
        surface: 'Table top',
        space: 'Dining table',
        hint: 'A 6 × 3 ft six-seater',
        sqft: 18,
        // "Six-seater" alone came back as an eight-seater once; the chair count
        // and the size pin it to the 18 sq ft we price.
        roomType: 'compact modern Indian dining area with a small six-seater dining table (three chairs on each long side) and a pendant light',
        application: 'Dining Table Top, a small rectangle about 6 feet long and 3 feet wide',
        slabs: 1,
    },
    living: {
        label: 'Living room',
        group: 'Living & bedroom',
        surface: 'TV wall',
        space: 'TV wall',
        hint: '7 × 8 ft behind the TV',
        sqft: 56,
        roomType: 'compact modern Indian apartment living room with a wall-mounted TV, a low TV unit and a sofa',
        application: 'TV Feature Wall panel behind the TV, about 7 feet wide and 8 feet high',
        slabs: 4,
    },
    bedroom: {
        label: 'Bedroom',
        group: 'Living & bedroom',
        surface: 'Headboard wall',
        space: 'Bedroom headboard wall',
        hint: '8 × 5 ft behind the bed',
        sqft: 40,
        roomType: 'compact modern Indian master bedroom with a queen bed and two bedside lamps',
        application: 'Feature Wall panel behind the headboard of the bed, about 8 feet wide and 5 feet high',
        slabs: 4,
    },
    pooja: {
        label: 'Pooja room',
        group: 'Pooja room',
        surface: 'Back wall',
        space: 'Pooja room',
        hint: 'Back wall of the mandir',
        sqft: 30,
        roomType: 'small modern Indian pooja room (home mandir) with a brass diya, a bell and marigold flowers',
        application: 'back wall of the mandir niche, about 5 feet wide',
        slabs: 4,
    },
    foyer: {
        label: 'Foyer',
        group: 'Floors & stairs',
        surface: 'Floor',
        space: 'Foyer floor',
        hint: 'A 6 × 8 ft foyer',
        sqft: 48,
        roomType: 'compact Indian apartment foyer just inside the front door, about 6 by 8 feet, with a shoe cabinet and a mirror',
        application: 'Flooring',
        slabs: 4,
        avoid: NOT_UNDERFOOT,
    },
    staircase: {
        label: 'Staircase',
        group: 'Floors & stairs',
        surface: 'Treads and risers',
        space: 'Staircase',
        hint: '12 steps, 3½ ft wide',
        sqft: 75,
        roomType: 'compact modern duplex apartment staircase with twelve straight steps and a glass railing',
        application: 'Staircase treads and risers',
        slabs: 1,
        avoid: NOT_UNDERFOOT,
    },
    balcony: {
        label: 'Balcony',
        group: 'Floors & stairs',
        surface: 'Floor',
        space: 'Balcony floor',
        hint: 'A 4 × 10 ft balcony',
        sqft: 40,
        roomType: 'compact Indian apartment balcony, about 4 by 10 feet, with potted plants and a cane chair',
        application: 'Flooring',
        slabs: 1,
        // Outdoors: sun, rain and bare feet. Polished marble goes slippery and
        // dull out there, so only the stones yards actually sell for it.
        only: ['Sandstone', 'Granite', 'Travertine'],
    },
};

export const SCENE_IDS = Object.keys(SCENES);

// ─── Art direction ──────────────────────────────────────────────────────────
// The first renders came out plain: white walls, bare surfaces, a straight-on
// camera and flat light. A second pass added contrasting walls and props, but
// every room of one kind got the same props and the same few palettes, so the
// hero's eight bathrooms read as one design. Now each render gets:
//   - an ARCHITECTURAL STYLE (below): its own walls, materials, architectural
//     details, fixtures and light. Each style lists the stone tones it
//     contrasts with (a pale marble against inky Art Deco navy, a black granite
//     against pale Japandi oak), from the slab photo's measured brightness;
//   - the room's own things and camera (LOOKS), kept style-neutral so the
//     style decides what they are made of;
//   - "the stone is ONLY on <surface>", so the model does not clad more than
//     the lot can cover.
// It all travels in the live visualiser's own `roomType` and `roomStyle`
// fields; the live prompt is unchanged. The compact sizes above still lead.

export const STYLES = {
    'contemporary-indian': {
        name: 'Contemporary Indian',
        walls: 'deep bottle-green lime-plaster walls',
        materials: 'warm teak wood, cane weave and brushed brass',
        architecture: 'a slim arched niche and fluted wood panelling',
        fixtures: 'brass pendant lights and a carved wooden mirror frame',
        light: 'warm late-afternoon sun slanting across the room',
        tones: ['light', 'mid'],
    },
    'art-deco': {
        name: 'Art Deco',
        walls: 'inky navy lacquered walls',
        materials: 'polished brass, fluted glass and dark walnut',
        architecture: 'stepped mouldings and a scalloped arch',
        fixtures: 'a scalloped brass mirror and opal globe sconces',
        light: 'glamorous warm evening light',
        tones: ['light'],
    },
    haveli: {
        name: 'Rajasthani haveli',
        walls: 'deep indigo and rust lime-plaster walls',
        materials: 'carved sheesham wood, hammered brass and block-printed textiles',
        architecture: 'cusped Mughal arches and a carved jaali screen',
        fixtures: 'a pierced brass lantern',
        light: 'warm light filtering through the jaali in soft patterns',
        tones: ['light', 'mid'],
    },
    industrial: {
        name: 'Industrial loft',
        walls: 'exposed red-brick and charcoal walls',
        materials: 'black steel, reclaimed wood and polished concrete',
        architecture: 'a black steel-framed glass partition and exposed ceiling beams',
        fixtures: 'filament-bulb pendant lights',
        light: 'moody side light from a tall steel-framed window',
        tones: ['light', 'mid'],
    },
    mediterranean: {
        name: 'Mediterranean',
        walls: 'sun-washed terracotta limewash walls',
        materials: 'rustic oak, hand-glazed zellige accents and wrought iron',
        architecture: 'rounded arches and a deep window reveal',
        fixtures: 'a wrought-iron lantern',
        light: 'bright golden sunlight',
        tones: ['light', 'dark'],
    },
    'mid-century': {
        name: 'Mid-century modern',
        walls: 'warm mustard-ochre walls with walnut panelling',
        materials: 'teak, olive-green upholstery and terrazzo accents',
        architecture: 'a wood-slatted ceiling and low horizontal lines',
        fixtures: 'a brass globe pendant',
        light: 'warm afternoon light',
        tones: ['light', 'dark'],
    },
    japandi: {
        name: 'Japandi',
        walls: 'warm greige limewash walls',
        materials: 'pale white oak, linen and handmade ceramics',
        architecture: 'slatted oak screens and clean low lines',
        fixtures: 'a paper lantern and matte black fittings',
        light: 'soft diffused daylight',
        tones: ['dark', 'mid'],
    },
    scandinavian: {
        name: 'Scandinavian',
        walls: 'soft sage-green walls with white trim',
        materials: 'light birch, wool and white ceramics',
        architecture: 'a wide simple window and clean skirting',
        fixtures: 'a white dome pendant',
        light: 'bright clean daylight',
        tones: ['dark', 'mid'],
    },
    neoclassical: {
        name: 'Neoclassical',
        walls: 'dusty blush walls with white panel mouldings',
        materials: 'gilded details, velvet and polished nickel',
        architecture: 'classical wall panelling, cornices and a tall French door',
        fixtures: 'a small crystal chandelier',
        light: 'soft, elegant daylight',
        tones: ['dark', 'mid'],
    },
    tropical: {
        name: 'Tropical modern',
        walls: 'warm white walls with dark teak accents',
        materials: 'teak, cane, terracotta pots and lush green plants',
        architecture: 'large openings onto greenery and a sloping wooden ceiling',
        fixtures: 'a woven rattan pendant',
        light: 'dappled daylight filtered through leaves',
        tones: ['dark', 'mid'],
    },
    'warm-minimal': {
        name: 'Warm minimal concrete',
        walls: 'smooth warm-grey concrete walls',
        materials: 'oak, linen and black metal',
        architecture: 'deep concrete reveals and a skylight',
        fixtures: 'recessed linear lights',
        light: 'a soft shaft of daylight from a skylight',
        tones: ['light', 'dark'],
    },
};

export const STYLE_IDS = Object.keys(STYLES);

// What each room holds and where the camera stands. Style-neutral on purpose:
// the style decides the materials, metal and colours of these things.
const LOOKS = {
    bathroom: {
        props: 'a mirror, a wall-mounted tap, a wall-hung vanity with a basin, rolled towels and a plant on a small shelf',
        camera: 'photographed at eye level from a three-quarter angle with a 35mm lens',
    },
    floor: {
        props: 'a wall-hung vanity, a clear glass shower screen, a towel on a hook and a plant in a pot standing on the floor',
        camera: 'photographed from a slightly high three-quarter angle so the whole floor is clearly visible',
    },
    vanity: {
        // "Only the top": a first try wrapped the stone down the vanity front.
        props: 'a vessel basin, a slender tap, a mirror, wall sconces, a vanity cabinet in wood or paint (the stone is ONLY the counter top and its thin front edge), and a small vase of dried flowers and a candle on the counter',
        camera: 'photographed from a three-quarter angle slightly above counter height, showing the stone top and its front edge',
    },
    kitchen: {
        // "Stone only on…": a first try clad the cabinet fronts too.
        props: 'cabinet fronts in wood or paint (the stone is ONLY on the counter top and backsplash), open shelves with ceramics and jars, a pendant light, and on the counter a chopping board with fresh herbs and lemons and a kettle, with most of the counter left clear',
        camera: 'photographed from a three-quarter angle slightly above counter height, so the stone counter top and backsplash both read clearly',
    },
    dining: {
        // Slim legs: a first try stood the top on a solid stone pedestal.
        props: 'a stone table top on slim legs (the stone is ONLY the top), a pendant lamp above the table, a vase of fresh flowers and a bowl of fruit on the table, upholstered chairs, art and a sideboard behind',
        camera: 'photographed from a three-quarter angle at standing eye level, slightly above the table, so the table top reads clearly',
    },
    living: {
        props: 'a low TV console with books and ceramics, an accent armchair with a throw, a floor lamp, a tall indoor plant and cushions on the sofa',
        camera: 'photographed at eye level from a three-quarter angle with a 28mm lens',
    },
    bedroom: {
        props: 'layered bedding, bedside lights, a bench at the foot of the bed, and a vase and a book on the bedside table',
        camera: 'photographed at eye level from a three-quarter angle near the foot of the bed',
    },
    pooja: {
        props: 'a carved mandir shelf, lit brass diyas with small warm flames, brass bells, a brass kalash, marigold garlands and a few rose petals',
        camera: 'photographed at eye level from a gentle three-quarter angle',
    },
    foyer: {
        props: 'a slim console with a mirror above it, a vase with branches, a key bowl, and a small bench with a pair of shoes beside it',
        // A steeper "slightly high" angle filled the frame with floor and lost the room.
        camera: 'photographed at standing eye level from a three-quarter angle, so the stone floor fills the lower half of the picture and the console, mirror, bench and front door are clearly visible',
    },
    staircase: {
        props: 'a handrail, framed art going up the wall, a large potted plant at the foot of the stairs and warm LED strips under each tread',
        camera: 'photographed at eye level from a three-quarter angle at the foot of the stairs',
    },
    balcony: {
        props: 'potted plants and hanging planters, a chair with a cushion, a small side table with a cup of chai and string lights along the railing',
        camera: 'photographed from a three-quarter angle at standing eye level so the floor is clearly visible',
    },
};

// Same lot and room always get the same style; other lots and rooms spread
// across the styles.
const pickIndex = (key, n) => {
    let h = 7;
    for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) % 1000003;
    return h % n;
};

/** The styles that contrast with a stone of this tone. */
export const stylesForTone = (tone) => STYLE_IDS.filter((id) => STYLES[id].tones.includes(tone));

/**
 * The room description and style for a render of `lot` in `sceneId`.
 * @param tone     'light' | 'mid' | 'dark', the slab photo's measured brightness
 * @param styleId  a key of STYLES; picked from the tone when left out
 * @returns {{ roomType: string, roomStyle: string, styleId: string }}
 */
export function artDirection(lot, sceneId, tone = 'mid', styleId = null) {
    const scene = SCENES[sceneId];
    const look = LOOKS[sceneId];
    const choices = stylesForTone(tone);
    const id = STYLES[styleId] ? styleId : choices[pickIndex(`${lot.id}|${sceneId}`, choices.length)];
    const style = STYLES[id];
    if (!look) return { roomType: scene.roomType, roomStyle: style.name, styleId: id };
    return {
        styleId: id,
        roomStyle: style.name,
        roomType: [
            scene.roomType,
            `designed in a ${style.name} style`,
            style.walls,
            `materials: ${style.materials}`,
            `architectural details: ${style.architecture}`,
            `styled with ${look.props}, and ${style.fixtures}`,
            look.camera,
            style.light,
            `the stone ${scene.surface.toLowerCase()} stays fully visible and is the hero of the picture`,
        ].join('; '),
    };
}

// Groups in display order, for the room pickers.
export const GROUPS = [...new Set(SCENE_IDS.map((id) => SCENES[id].group))];

/** Is this stone a sensible choice for this room at all? (Ignores size.) */
export const suits = (lot, sceneId) => {
    const s = SCENES[sceneId];
    if (s.only) return s.only.includes(lot.family);
    return !s.avoid?.includes(lot.family);
};

/** A scene as a place in a sentence ("table top in a dining room"); its label names the application. */
export const placeOf = (scene) => scene.place || scene.label.toLowerCase();

/** Can this lot finish this room: the right stone, and enough of it? */
export const canDo = (lot, sceneId) => suits(lot, sceneId) && lot.sqft >= SCENES[sceneId].sqft;

/** The rooms this lot can finish, in display order. */
export const roomsFor = (lot) => SCENE_IDS.filter((id) => canDo(lot, id));

// Surfaces a buyer can put a lot on in a photo of THEIR OWN room. `where` goes
// to the stone-swap prompt (server/swapStone.js) and tells the model how to
// find the surface in a photo it has never seen; `hint` tells the buyer.
export const OWN_SURFACES = [
    { id: 'floor', label: 'Floor', hint: 'All the floor you can see', where: 'the floor: all of the visible floor area of the room', slabs: 4, avoid: NOT_UNDERFOOT },
    {
        id: 'wall',
        label: 'Feature wall',
        hint: 'One wall, like the one behind the TV or bed',
        where: 'the feature wall: the single most prominent wall in the photo, such as the wall behind the TV, the bed, the sofa or the vanity',
        slabs: 4,
    },
    {
        id: 'counter',
        label: 'Kitchen counter',
        hint: 'The counter top and its edge',
        where: 'the kitchen counter top, including its front edge (and the backsplash if it is the same material)',
        slabs: 1,
        avoid: NOT_FOR_KITCHEN,
    },
    { id: 'vanity', label: 'Vanity top', hint: 'The counter around the basin', where: 'the bathroom vanity counter top around the basin, including its front edge', slabs: 1 },
    { id: 'bathwalls', label: 'Bathroom walls', hint: 'Every wall in the bathroom', where: 'the bathroom walls: every visible wall surface in the bathroom', slabs: 4 },
    { id: 'table', label: 'Table top', hint: 'The top of the main table', where: 'the top of the main table, including its edges (and its legs if they are the same material)', slabs: 1 },
    { id: 'stairs', label: 'Staircase', hint: 'Every step and riser', where: 'the staircase: every visible tread and riser of the steps', slabs: 1, avoid: NOT_UNDERFOOT },
];

export const ownSurfacesFor = (lot) => OWN_SURFACES.filter((s) => !s.avoid?.includes(lot.family));
