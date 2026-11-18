// What a buyer does with lots (decided 2026-11-17): where they are, a cart,
// a booking with a 2% advance that gives them the yard's details to visit, and
// credits for "Your room" renders. Prototype: kept in this browser (store.js);
// production: Supabase tables behind server routes, Razorpay for payments, and
// the booking details sent on WhatsApp by the business API (PLAN.md).
import { jobFor } from './lots';
import { makeStore, useStore } from './store';

// ─── Where the buyer is ────────────────────────────────────────────────────
// Asked on the first visit and kept with their enquiries and bookings, for
// our team only (decided 2026-11-17); nothing on the site changes with it.
const buyerStore = makeStore('ston-buyer-location', null); // { city, pincode, at } | { skipped: true, at }
export const useBuyerLocation = () => useStore(buyerStore);
export const setBuyerLocation = (loc) => buyerStore.set({ ...loc, at: Date.now() });
export const locationLabel = (loc) => (loc?.city ? `${loc.city}${loc.pincode ? ` ${loc.pincode}` : ''}` : '');
export const BUYER_CITIES = [
    'Delhi',
    'Gurugram',
    'Noida',
    'Mumbai',
    'Pune',
    'Bengaluru',
    'Hyderabad',
    'Chennai',
    'Kolkata',
    'Ahmedabad',
    'Surat',
    'Jaipur',
    'Udaipur',
    'Jodhpur',
    'Lucknow',
    'Chandigarh',
    'Indore',
    'Bhopal',
    'Nagpur',
    'Kochi',
    'Coimbatore',
];

// ─── Cart ──────────────────────────────────────────────────────────────────
// One line per lot: the sq ft the buyer needs (rounded up to slabs when
// priced), or null for the whole lot.
const cartStore = makeStore('ston-cart', []); // [{ lotId, need, at }]
export const useCart = () => useStore(cartStore);
export const addToCart = (lotId, need = null) =>
    cartStore.set((items) => [...items.filter((i) => i.lotId !== lotId), { lotId, need: need || null, at: Date.now() }]);
export const removeFromCart = (lotId) => cartStore.set((items) => items.filter((i) => i.lotId !== lotId));
export const clearCart = (lotIds) => cartStore.set((items) => items.filter((i) => !lotIds.includes(i.lotId)));

/** A cart or booking line, priced: the lot, its slabs, sq ft and cost. */
export const lineFor = (lot, need) => {
    const job = jobFor(lot, need || lot.sqft);
    return { lot, need: need || null, ...job };
};

// ─── Bookings: 2% advance, then the buyer visits the yard ──────────────────
// The advance counts toward what they buy; if they buy nothing, it is refunded
// in full. Our team records the outcome: full, part or no purchase.
export const ADVANCE_PCT = 2;
export const advanceFor = (total) => Math.ceil((total * ADVANCE_PCT) / 100);
const bookingStore = makeStore('ston-bookings', []);
export const useBookings = () => useStore(bookingStore);
export const BOOKING_STATUS = {
    booked: { label: 'Booked, visit due', chip: 'bg-paper-2 text-ink-2' },
    visited: { label: 'Visited the yard', chip: 'bg-paper-2 text-ink' },
    full: { label: 'Bought it all', chip: 'bg-moss-soft text-moss' },
    partial: { label: 'Bought part', chip: 'bg-moss-soft text-moss' },
    none: { label: 'Bought nothing: refund', chip: 'bg-clay-soft text-clay' },
};
export const isOpenBooking = (b) => b.status === 'booked' || b.status === 'visited';

export function createBooking({ items, customer, location, creditsSpent }) {
    const total = items.reduce((n, i) => n + i.cost, 0);
    const booking = {
        id: `B${Date.now().toString(36).toUpperCase()}`,
        at: Date.now(),
        customer,
        location: location || null,
        items,
        total,
        advance: advanceFor(total),
        creditsSpent: creditsSpent || 0,
        status: 'booked',
        outcome: null,
    };
    bookingStore.set((list) => [booking, ...list]);
    return booking;
}
export const updateBooking = (id, patch) => bookingStore.set((list) => list.map((b) => (b.id === id ? { ...b, ...patch } : b)));

// ─── Credits for "Your room" renders ───────────────────────────────────────
// 3 free, then 10 for ₹199 (decided 2026-11-17). Ready-made pictures cost
// nothing; every new AI picture of the buyer's own room (or a design) takes
// one. What they paid for credits is refunded if they buy more than 50 sq ft.
export const FREE_RENDERS = 3;
export const CREDIT_PACK = { renders: 10, price: 199 };
export const CREDIT_REFUND_SQFT = 50;
const creditStore = makeStore('ston-credits', { free: FREE_RENDERS, paid: 0, spent: 0 });
export const useCredits = () => useStore(creditStore);
export const creditsLeft = (c) => c.free + c.paid;
/** Take one credit: 'free' | 'paid', or null when there are none left. */
export function takeCredit() {
    const c = creditStore.get();
    if (c.free > 0) {
        creditStore.set({ ...c, free: c.free - 1 });
        return 'free';
    }
    if (c.paid > 0) {
        creditStore.set({ ...c, paid: c.paid - 1 });
        return 'paid';
    }
    return null;
}
/** A render that failed gives its credit back. */
export function giveCreditBack(kind) {
    const c = creditStore.get();
    if (kind === 'free') creditStore.set({ ...c, free: c.free + 1 });
    if (kind === 'paid') creditStore.set({ ...c, paid: c.paid + 1 });
}
/** Demo payment: 10 more renders for ₹199. */
export const buyCreditPack = () => creditStore.set((c) => ({ ...c, paid: c.paid + CREDIT_PACK.renders, spent: c.spent + CREDIT_PACK.price }));

// ─── Happy customers ───────────────────────────────────────────────────────
// Stories our team adds after a purchase, only with the customer's
// permission. Nothing made up: with none yet, the section asks for the first.
const storyStore = makeStore('ston-stories', []); // [{ id, name, city, quote, photo, source, consent, published, at }]
export const useStories = () => useStore(storyStore);
export const addStory = (story) => storyStore.set((list) => [{ ...story, id: `S${Date.now().toString(36)}`, at: Date.now() }, ...list]);
export const updateStory = (id, patch) => storyStore.set((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
export const removeStory = (id) => storyStore.set((list) => list.filter((s) => s.id !== id));
