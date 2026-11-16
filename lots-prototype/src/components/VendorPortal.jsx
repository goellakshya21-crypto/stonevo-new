import React, { useEffect, useState } from 'react';
import { CITIES, inchSize, inr, pieceInches } from '../lib/lots';
import { GSTIN_RE, useYard, yard } from '../lib/vendor';
import { Arrow, Brand, Check, Pin } from './ui';
import ListLotSheet from './ListLotSheet';

/**
 * The yard portal (#/yards): a stone yard logs in with its mobile number and a
 * one-time code, is verified once (yard details and GSTIN), then lists its
 * lots, which our team reviews (#/review) before they go live, and marks them
 * sold when they sell at its end, which takes them off the site at once.
 *
 * Buyers never see the yard: a listing reaches the storefront with its city
 * only (lots.js, lotFromListing).
 *
 * Prototype: the one-time code is not sent (any 6 digits work), the GSTIN is
 * only checked for its format, and the "check" passes after a moment. In
 * production: the existing phone OTP, the GSTIN looked up on the GST register,
 * and a call from the team; stored in `leads` (role 'vendor'), never in a
 * table the browser can read.
 */
export default function VendorPortal({ catalogueNames, onHome, onViewLot }) {
    const { account, listings, storageFull } = useYard();
    const mine = account ? listings.filter((l) => l.phone === account.phone) : [];

    return (
        <div className="min-h-screen bg-paper">
            <header className="border-b border-ink/10 bg-paper/90 backdrop-blur sticky top-0 z-30">
                <div className="max-w-[1180px] mx-auto h-[60px] md:h-[68px] px-4 md:px-8 flex items-center justify-between gap-3">
                    <button onClick={onHome} className="flex items-center gap-2.5" aria-label="Back to the site">
                        <Brand />
                        <span className="hidden sm:inline text-[12px] font-extrabold uppercase tracking-[0.16em] text-ink-3">for stone yards</span>
                    </button>
                    <div className="flex items-center gap-2">
                        {account?.status === 'verified' && (
                            <span className="hidden md:inline text-[13px] font-semibold text-ink-2 truncate max-w-[220px]">{account.profile?.yardName}</span>
                        )}
                        {account ? (
                            <button
                                onClick={() => yard.logOut()}
                                className="h-10 px-4 rounded-full border border-ink/15 text-[13px] font-bold hover:border-ink"
                            >
                                Log out
                            </button>
                        ) : (
                            <button onClick={onHome} className="h-10 px-4 rounded-full border border-ink/15 text-[13px] font-bold hover:border-ink">
                                Back to the site
                            </button>
                        )}
                    </div>
                </div>
            </header>

            <main className="max-w-[1180px] mx-auto px-4 md:px-8 py-8 md:py-12">
                {!account ? (
                    <Welcome />
                ) : account.status !== 'verified' ? (
                    <Verify account={account} />
                ) : (
                    <Dashboard account={account} mine={mine} catalogueNames={catalogueNames} onViewLot={onViewLot} />
                )}
                {storageFull && (
                    <p className="mt-6 rounded-xl bg-clay-soft text-clay text-[13px] font-semibold px-4 py-3" role="alert">
                        This browser is out of room for more photos, so your latest change is kept until you close the tab but not saved. (Prototype only: the
                        live portal saves to our servers.)
                    </p>
                )}
            </main>
        </div>
    );
}

// ─── Log in ─────────────────────────────────────────────────────────────────

function Welcome() {
    return (
        <div className="grid md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)] gap-8 md:gap-12 items-start">
            <div>
                <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">For stone yards</p>
                <h1 className="mt-2 font-brand text-[40px] md:text-[56px] leading-[1.02]">Turn the lots in your yard into cash and space.</h1>
                <ul className="mt-6 space-y-3 max-w-[520px]">
                    {[
                        'List a lot from your phone in five minutes: photos, size, your price.',
                        'Our team checks each lot, usually within a few hours, and then it goes live.',
                        'Sold it at your end? Mark it sold and it comes off the site at once.',
                        'Your yard name, address and number stay private. Buyers see only the city.',
                        'We find the buyer, collect payment and send the pickup truck.',
                    ].map((t) => (
                        <li key={t} className="flex gap-3 text-[15px] text-ink-2">
                            <span className="w-6 h-6 rounded-full bg-moss text-paper grid place-items-center shrink-0 mt-0.5">
                                <Check className="w-3.5 h-3.5" />
                            </span>
                            {t}
                        </li>
                    ))}
                </ul>
            </div>
            <div className="rounded-[24px] bg-white/80 border border-ink/10 p-6 md:p-7 shadow-card">
                <Steps at={1} />
                <h2 className="mt-4 font-brand text-[30px] leading-[1.05]">Log in to your yard</h2>
                <p className="mt-1.5 text-[14px] text-ink-2">With your mobile number. We send a one-time code to check it is yours; no password.</p>
                <PhoneOtp onDone={(phone) => yard.logIn(phone)} />
            </div>
        </div>
    );
}

const Steps = ({ at }) => (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11.5px] font-bold uppercase tracking-[0.1em]" aria-label="Steps">
        {['Mobile', 'Yard details', 'Verified'].map((s, i) => (
            <li key={s} className={`flex items-center gap-1.5 ${i + 1 <= at ? 'text-ink' : 'text-ink-3'}`}>
                <span
                    className={`w-5 h-5 rounded-full grid place-items-center text-[10.5px] ${
                        i + 1 < at ? 'bg-moss text-paper' : i + 1 === at ? 'bg-ink text-paper' : 'bg-paper-2 text-ink-3'
                    }`}
                >
                    {i + 1 < at ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="whitespace-nowrap">{s}</span>
                {i < 2 && <span className="w-4 h-px bg-ink/20 ml-1" aria-hidden="true" />}
            </li>
        ))}
    </ol>
);

function PhoneOtp({ onDone }) {
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [code, setCode] = useState('');
    const input = 'w-full h-12 rounded-xl border border-ink/15 bg-white px-3 text-[15px] outline-none focus:border-ink';
    return step === 'phone' ? (
        <form
            className="mt-5"
            onSubmit={(e) => {
                e.preventDefault();
                setStep('code');
            }}
        >
            <label className="block">
                <span className="text-[12px] font-semibold text-ink-3">Mobile number</span>
                <div className="mt-1 flex h-12 rounded-xl border border-ink/15 bg-white focus-within:border-ink">
                    <span className="px-3 grid place-items-center text-[15px] text-ink-3 border-r border-ink/10">+91</span>
                    <input
                        required
                        inputMode="numeric"
                        pattern="[0-9]{10}"
                        maxLength={10}
                        title="10-digit mobile number"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                        className="flex-1 min-w-0 px-3 text-[15px] outline-none bg-transparent tracking-wide"
                        aria-label="Mobile number"
                    />
                </div>
            </label>
            <button className="mt-4 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">Send the code</button>
            <p className="mt-2 text-[12px] text-ink-3 text-center">Demo: no code is sent; any 6 digits work.</p>
        </form>
    ) : (
        <form
            className="mt-5"
            onSubmit={(e) => {
                e.preventDefault();
                onDone(phone);
            }}
        >
            <label className="block">
                <span className="text-[12px] font-semibold text-ink-3">
                    The 6-digit code sent to +91 {phone.slice(0, 2)}••••••{phone.slice(-2)}
                </span>
                <input
                    autoFocus
                    required
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    title="6-digit code"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                    className={`mt-1 ${input} text-[20px] font-bold tracking-[0.4em] tabular-nums`}
                    aria-label="One-time code"
                />
            </label>
            <button className="mt-4 w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">Log in</button>
            <button type="button" onClick={() => setStep('phone')} className="mt-2 w-full text-[13px] font-bold text-ink-2 hover:text-ink">
                Change the number
            </button>
        </form>
    );
}

// ─── Verify the yard ────────────────────────────────────────────────────────

/**
 * What is wrong with a GSTIN, in words ('' when it is fine). A GSTIN is 15
 * characters: 2-digit state code, the 10-character PAN, an entity number, Z,
 * and a check character.
 */
const gstinProblem = (g) => {
    if (!g) return 'Enter your GSTIN.';
    if (g.length < 15) return `That is ${g.length} of the 15 characters.`;
    if (!/^[0-9]{2}/.test(g)) return 'A GSTIN starts with your 2-digit state code (08 for Rajasthan).';
    if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]/.test(g)) return 'Characters 3 to 12 are your PAN: 5 letters, 4 numbers, 1 letter (like ABCDE1234F).';
    if (g[13] !== 'Z') return 'The 14th character of a GSTIN is always Z.';
    if (!GSTIN_RE.test(g)) return 'Check the 13th and the last character against your GST certificate.';
    return '';
};

function Verify({ account }) {
    const p = account.profile || {};
    const [gstin, setGstin] = useState(p.gstin || '');
    const gstOk = GSTIN_RE.test(gstin);
    // GSTIN is optional for now (2026-11-14): blank or not quite right, the
    // details still go; our team asks for it on the welcome call. A GSTIN that
    // is typed but looks wrong gets a gentle note saying why, never a block.
    const showProblem = !!gstin && !gstOk && gstin.length === 15;

    // Prototype: the check passes after a moment. Production: GST register
    // lookup (name and address must match), then a call from the team.
    useEffect(() => {
        if (account.status !== 'checking') return undefined;
        const t = setTimeout(() => yard.verify(), 2200);
        return () => clearTimeout(t);
    }, [account.status]);

    if (account.status === 'checking') {
        return (
            <div className="max-w-[560px] mx-auto rounded-[24px] bg-white/80 border border-ink/10 p-6 md:p-8 shadow-card">
                <Steps at={3} />
                <h1 className="mt-4 font-brand text-[32px] leading-[1.05]">Checking {account.profile.yardName}</h1>
                <ul className="mt-5 space-y-3 text-[14.5px]">
                    <li className="flex gap-3">
                        <Check className="w-5 h-5 text-moss shrink-0" /> Mobile number checked with a one-time code
                    </li>
                    {account.profile.gstinOk ? (
                        <li className="flex gap-3">
                            <span className="w-5 h-5 rounded-full border-2 border-ink/20 border-t-ink animate-spin shrink-0" aria-hidden="true" />
                            GSTIN {account.profile.gstin} matched to the GST register
                        </li>
                    ) : (
                        <li className="flex gap-3 text-ink-3">
                            <span className="w-5 h-5 rounded-full border-2 border-ink/15 shrink-0" aria-hidden="true" />
                            GSTIN {account.profile.gstin ? `${account.profile.gstin} to confirm` : 'not given yet'}: we ask for it on our call
                        </li>
                    )}
                    <li className="flex gap-3 text-ink-3">
                        <span className="w-5 h-5 rounded-full border-2 border-ink/15 shrink-0" aria-hidden="true" /> A call from our team to say hello (within a
                        day)
                    </li>
                </ul>
                <p className="mt-5 text-[12px] text-ink-3">
                    Demo: the check passes in a moment. Live, the GST lookup takes seconds and our team calls within a day.
                </p>
            </div>
        );
    }

    const input = 'mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink';
    return (
        <div className="max-w-[720px] mx-auto rounded-[24px] bg-white/80 border border-ink/10 p-6 md:p-8 shadow-card">
            <Steps at={2} />
            <h1 className="mt-4 font-brand text-[32px] md:text-[38px] leading-[1.05]">Tell us about your yard</h1>
            <p className="mt-1.5 text-[14px] text-ink-2">
                We check every yard once before its lots go on the site, so buyers can trust what they buy. None of this is shown to buyers: they only ever see
                the city.
            </p>
            <form
                className="mt-6 grid sm:grid-cols-2 gap-4"
                onSubmit={(e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    yard.submitProfile({
                        yardName: String(f.get('yardName')).trim(),
                        contact: String(f.get('contact')).trim(),
                        gstin,
                        gstinOk: gstOk,
                        cityKey: String(f.get('city')),
                        address: String(f.get('address')).trim(),
                        directOk: f.get('directOk') === 'on',
                    });
                }}
            >
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">Yard or company name</span>
                    <input name="yardName" required defaultValue={p.yardName} className={input} />
                </label>
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">Your name</span>
                    <input name="contact" required defaultValue={p.contact} className={input} />
                </label>
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">GSTIN (optional for now)</span>
                    <input
                        name="gstin"
                        maxLength={15}
                        value={gstin}
                        onChange={(e) => setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ''))}
                        placeholder="e.g. 08ABCDE1234F1Z5"
                        className={`${input} uppercase tracking-wide`}
                        aria-invalid={showProblem}
                        aria-describedby="gstin-help"
                    />
                    <span id="gstin-help" className={`mt-1 block text-[12px] ${showProblem ? 'text-clay' : gstOk ? 'text-moss font-semibold' : 'text-ink-3'}`}>
                        {showProblem
                            ? `${gstinProblem(gstin)} You can still send it; we confirm it on our call.`
                            : gstOk
                              ? 'Looks right. We check it against the GST register next.'
                              : gstin
                                ? `15 characters from your GST certificate (${gstin.length} so far): state code, PAN, then 3 more.`
                                : 'Not compulsory for now. Adding it gets you verified faster; otherwise we ask on our call.'}
                    </span>
                </label>
                <label className="block">
                    <span className="text-[12px] font-semibold text-ink-3">City the yard is in</span>
                    <select name="city" required defaultValue={p.cityKey || 'kishangarh'} className={input}>
                        {Object.entries(CITIES).map(([k, c]) => (
                            <option key={k} value={k}>
                                {c.name}, {c.state}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="block sm:col-span-2">
                    <span className="text-[12px] font-semibold text-ink-3">Yard address (private: only for our pickup truck)</span>
                    <textarea
                        name="address"
                        required
                        rows={2}
                        defaultValue={p.address}
                        className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2 text-[14px] outline-none focus:border-ink resize-none"
                    />
                </label>
                <label className="sm:col-span-2 flex gap-3 rounded-xl bg-paper-2/70 px-4 py-3 cursor-pointer">
                    <input type="checkbox" name="directOk" defaultChecked={!!p.directOk} className="mt-1 w-4 h-4 accent-[#1C1915] shrink-0" />
                    <span className="text-[13.5px] text-ink-2">
                        <b className="text-ink">Open to direct buyers.</b> A buyer who pays us a fee (₹10,000 or ₹20,000) can get your yard&apos;s name and
                        number for one lot. Off unless you tick it; you can change it later.
                    </span>
                </label>
                <label className="sm:col-span-2 flex gap-3 text-[13.5px] text-ink-2 cursor-pointer">
                    <input type="checkbox" required className="mt-1 w-4 h-4 accent-[#1C1915] shrink-0" />I own or manage this yard and the stock I list, and I
                    can supply it.
                </label>
                <div className="sm:col-span-2">
                    <button className="w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">Send for checking</button>
                </div>
            </form>
        </div>
    );
}

// ─── My lots ───────────────────────────────────────────────────────────────

const ago = (t, now) => {
    if (!t) return '';
    const d = Math.floor((now - t) / 86400000);
    return d <= 0 ? 'today' : d === 1 ? 'yesterday' : `${d} days ago`;
};

function Dashboard({ account, mine, catalogueNames, onViewLot }) {
    // false | 'new' | a listing being fixed after it was sent back
    const [sheet, setSheet] = useState(false);
    const toCheck = mine.filter((l) => l.status === 'review' || l.status === 'changes');
    const [tab, setTab] = useState(() => (toCheck.length ? 'check' : 'live'));
    const [justSent, setJustSent] = useState(null);
    // "Listed 3 days ago": the clock is read once, when the page opens.
    const [now] = useState(() => Date.now());
    const live = mine.filter((l) => l.status === 'live');
    const sold = mine.filter((l) => l.status === 'sold');
    // Withdrawn by the yard, or cancelled by our team: neither is on the site.
    const withdrawn = mine.filter((l) => l.status === 'withdrawn' || l.status === 'cancelled');
    const needFix = mine.filter((l) => l.status === 'changes');
    const shown = tab === 'check' ? toCheck : tab === 'live' ? live : tab === 'sold' ? sold : withdrawn;
    const p = account.profile;

    return (
        <>
            <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                    <p className="inline-flex items-center gap-1.5 rounded-full bg-moss-soft text-moss text-[12px] font-bold px-2.5 py-1">
                        <Check className="w-3.5 h-3.5" /> Verified yard
                    </p>
                    <h1 className="mt-2 font-brand text-[36px] md:text-[48px] leading-[1.02]">{p.yardName}</h1>
                    <p className="mt-1 text-[14px] text-ink-3 flex items-center gap-1.5">
                        <Pin className="w-3.5 h-3.5" /> {CITIES[p.cityKey]?.name} · {p.contact} · +91 {account.phone}
                    </p>
                </div>
                <button onClick={() => setSheet('new')} className="h-12 px-6 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">
                    + List a lot
                </button>
            </div>

            {justSent && (
                <div className="mt-6 rounded-2xl bg-moss-soft px-4 py-3 flex flex-wrap items-center gap-3 fade-up" role="status">
                    <Check className="w-5 h-5 text-moss shrink-0" />
                    <span className="flex-1 min-w-[240px] text-[14px] text-moss">
                        <b>{justSent.name} is with our team for review.</b> We check the photos and the price, usually within a few hours, and it goes live on
                        the site then. You get a WhatsApp when it does.
                    </span>
                    <a
                        href="#/review"
                        className="h-9 px-3.5 rounded-full border border-moss/40 text-moss text-[12.5px] font-bold inline-flex items-center hover:border-moss"
                    >
                        Demo: review it as our team
                    </a>
                    <button onClick={() => setJustSent(null)} className="text-[12.5px] font-bold text-moss/80 hover:text-moss">
                        Dismiss
                    </button>
                </div>
            )}

            {needFix.length > 0 && !justSent && (
                <button
                    onClick={() => setTab('check')}
                    className="mt-6 w-full text-left rounded-2xl bg-clay-soft px-4 py-3 text-[14px] text-clay font-semibold flex items-center gap-3"
                >
                    <span className="w-6 h-6 rounded-full bg-clay text-paper grid place-items-center text-[12px] font-extrabold shrink-0">
                        {needFix.length}
                    </span>
                    {needFix.length === 1 ? `${needFix[0].name} needs a fix` : `${needFix.length} lots need a fix`} before{' '}
                    {needFix.length === 1 ? 'it goes' : 'they go'} live. See what our team said.
                    <Arrow className="w-4 h-4 ml-auto shrink-0" />
                </button>
            )}

            <dl className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    ['Live lots', `${live.length} · ${live.reduce((s, l) => s + l.sqft, 0)} sq ft`],
                    ['Waiting for review', toCheck.length - needFix.length],
                    ['Sold', sold.length],
                    ['Earned from sold lots', inr(sold.reduce((s, l) => s + l.yardPrice * l.sqft, 0))],
                ].map(([k, v]) => (
                    <div key={k} className="rounded-2xl bg-white/70 border border-ink/10 px-4 py-3">
                        <dt className="text-[12px] font-semibold text-ink-3">{k}</dt>
                        <dd className="mt-0.5 text-[22px] font-extrabold tabular-nums">{v}</dd>
                    </div>
                ))}
            </dl>

            <div className="mt-8 flex flex-wrap items-center gap-1.5" role="tablist" aria-label="Your lots">
                {[
                    ['check', `In review (${toCheck.length})`],
                    ['live', `Live (${live.length})`],
                    ['sold', `Sold (${sold.length})`],
                    ['withdrawn', `Withdrawn or cancelled (${withdrawn.length})`],
                ].map(([id, label]) => (
                    <button
                        key={id}
                        role="tab"
                        aria-selected={tab === id}
                        onClick={() => setTab(id)}
                        className={`h-9 px-3.5 rounded-full text-[13px] font-bold inline-flex items-center gap-1.5 ${
                            tab === id ? 'bg-ink text-paper' : 'bg-white/60 border border-ink/15 text-ink-2 hover:border-ink/40'
                        }`}
                    >
                        {id === 'check' && needFix.length > 0 && <span className="w-2 h-2 rounded-full bg-clay" aria-label="needs a fix" />}
                        {label}
                    </button>
                ))}
            </div>

            <div className="mt-4 space-y-3">
                {shown.length === 0 && (
                    <div className="rounded-2xl border-2 border-dashed border-ink/15 px-5 py-10 text-center">
                        <p className="font-bold text-[16px]">
                            {tab === 'check'
                                ? 'Nothing waiting for review'
                                : tab === 'live'
                                  ? 'No lots live yet'
                                  : tab === 'sold'
                                    ? 'Nothing sold yet'
                                    : 'Nothing withdrawn or cancelled'}
                        </p>
                        {(tab === 'live' || tab === 'check') && (
                            <>
                                <p className="mt-1 text-[14px] text-ink-2">
                                    List a lot: a few photos, the size and your price. About five minutes; our team checks it before it goes live.
                                </p>
                                <button onClick={() => setSheet('new')} className="mt-4 h-11 px-5 rounded-full bg-ink text-paper font-bold text-[14px]">
                                    + List a lot
                                </button>
                            </>
                        )}
                    </div>
                )}
                {shown.map((l) => (
                    <ListingRow key={l.id} l={l} now={now} onViewLot={onViewLot} onFix={() => setSheet(l)} />
                ))}
            </div>

            {sheet && (
                <ListLotSheet
                    account={account}
                    catalogueNames={catalogueNames}
                    editing={sheet === 'new' ? null : sheet}
                    onDone={(l) => {
                        setSheet(false);
                        setTab('check');
                        setJustSent(l);
                    }}
                    onClose={() => setSheet(false)}
                />
            )}
        </>
    );
}

const STATUS = {
    review: { label: 'In review', chip: 'bg-paper-2 text-ink-2' },
    changes: { label: 'Needs a fix', chip: 'bg-clay-soft text-clay' },
    live: { label: 'Live', chip: 'bg-moss-soft text-moss' },
    sold: { label: 'Sold', chip: 'bg-clay-soft text-clay' },
    withdrawn: { label: 'Withdrawn', chip: 'bg-paper-2 text-ink-3' },
    cancelled: { label: 'Cancelled by our team', chip: 'bg-clay-soft text-clay' },
};

function ListingRow({ l, now, onViewLot, onFix }) {
    const [confirm, setConfirm] = useState(null); // 'sold' | 'withdraw'
    const isLive = l.status === 'live';
    const offSite = l.status === 'sold' || l.status === 'withdrawn' || l.status === 'cancelled';
    const stale = isLive && now - l.confirmedAt > 7 * 86400000;
    const st = STATUS[l.status] || STATUS.review;
    const when = (t) => ago(Math.min(t, now), now);
    return (
        <div className={`rounded-2xl border p-3.5 md:p-4 ${offSite ? 'bg-paper-2/50 border-ink/5' : 'bg-white/80 border-ink/10'}`}>
            <div className="flex flex-col md:flex-row md:items-center gap-3 md:gap-4">
                <div className="flex items-center gap-3 md:gap-4 min-w-0 flex-1">
                    <img
                        src={l.photos[0]}
                        alt=""
                        className={`w-20 h-20 md:w-24 md:h-24 rounded-xl object-cover shrink-0 ${offSite ? 'grayscale opacity-70' : ''}`}
                    />
                    <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <p className="font-brand text-[22px] leading-tight truncate">{l.name}</p>
                            <span className={`rounded-md text-[11px] font-extrabold uppercase tracking-[0.08em] px-1.5 py-0.5 ${st.chip}`}>{st.label}</span>
                        </div>
                        <p className="text-[13px] text-ink-3">
                            {l.family} · {l.sqft} sq ft · {l.pieces} {l.pieces === 1 ? 'piece' : 'pieces'}
                            {pieceInches(l) ? ` of ${inchSize(...pieceInches(l))}` : ''} · {l.thicknessMm} mm {l.finish.toLowerCase()} ·{' '}
                            {CITIES[l.cityKey]?.name}
                            {l.video ? ' · with video' : ''}
                        </p>
                        <p className="mt-1 text-[13.5px]">
                            You get <b className="tabular-nums">{inr(l.yardPrice)}/sq ft</b> · <b className="tabular-nums">{inr(l.yardPrice * l.sqft)}</b> for
                            the whole lot
                        </p>
                        <p className="text-[12px] text-ink-3">
                            {l.status === 'review'
                                ? `Sent ${when(l.sentAt)} · our team checks it within a few hours, then it goes live`
                                : l.status === 'changes'
                                  ? `Sent back ${when(l.review?.at)} · fix it and send it again`
                                  : isLive
                                    ? `Live since ${when(l.listedAt)} · still available, confirmed ${when(l.confirmedAt)}`
                                    : l.status === 'sold'
                                      ? `Sold ${when(l.soldAt)} · off the site`
                                      : l.status === 'cancelled'
                                        ? `Cancelled ${when(l.cancelledAt)} · it will not go on the site; you can list a new lot any time`
                                        : `Withdrawn ${when(l.withdrawnAt)} · off the site`}
                        </p>
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:justify-end md:max-w-[360px]">
                    {confirm ? (
                        <div className="w-full rounded-xl bg-clay-soft px-3 py-2.5 text-[13px] text-clay" role="alert">
                            <p className="font-semibold">
                                {confirm === 'sold'
                                    ? 'Sold at your end? It comes off the site straight away.'
                                    : isLive
                                      ? 'Take it off the site? You can list it again later.'
                                      : 'Stop this listing? You can list it again later.'}
                            </p>
                            <div className="mt-2 flex gap-2">
                                <button
                                    onClick={() => {
                                        if (confirm === 'sold') yard.markSold(l.id);
                                        else yard.withdraw(l.id);
                                        setConfirm(null);
                                    }}
                                    className="h-9 px-3.5 rounded-full bg-clay text-paper text-[12.5px] font-bold"
                                >
                                    {confirm === 'sold' ? 'Yes, it is sold' : isLive ? 'Yes, take it off' : 'Yes, stop it'}
                                </button>
                                <button onClick={() => setConfirm(null)} className="h-9 px-3 rounded-full text-[12.5px] font-bold text-clay/80 hover:text-clay">
                                    Cancel
                                </button>
                            </div>
                        </div>
                    ) : isLive ? (
                        <>
                            <button onClick={() => setConfirm('sold')} className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold">
                                Mark as sold
                            </button>
                            <button
                                onClick={() => yard.confirmAvailable(l.id)}
                                className={`h-10 px-3.5 rounded-full border text-[13px] font-bold ${stale ? 'border-clay text-clay' : 'border-ink/15 hover:border-ink'}`}
                            >
                                Still available
                            </button>
                            <button
                                onClick={() => onViewLot(l.id)}
                                className="h-10 px-3 rounded-full text-[13px] font-bold text-ink-2 hover:text-ink inline-flex items-center gap-1"
                            >
                                On the site <Arrow className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={() => setConfirm('withdraw')} className="h-10 px-3 rounded-full text-[13px] font-bold text-ink-3 hover:text-ink">
                                Withdraw
                            </button>
                        </>
                    ) : l.status === 'changes' ? (
                        <>
                            <button onClick={onFix} className="h-10 px-4 rounded-full bg-ink text-paper text-[13px] font-bold">
                                Fix and send again
                            </button>
                            <button onClick={() => setConfirm('withdraw')} className="h-10 px-3 rounded-full text-[13px] font-bold text-ink-3 hover:text-ink">
                                Withdraw
                            </button>
                        </>
                    ) : l.status === 'cancelled' ? null : l.status === 'review' ? (
                        <button onClick={() => setConfirm('withdraw')} className="h-10 px-3 rounded-full text-[13px] font-bold text-ink-3 hover:text-ink">
                            Withdraw
                        </button>
                    ) : (
                        // Approved before, so it goes straight back on the site.
                        <button
                            onClick={() => (l.listedAt ? yard.relist(l.id) : onFix())}
                            className="h-10 px-4 rounded-full border border-ink/15 text-[13px] font-bold hover:border-ink"
                        >
                            {l.status === 'sold' ? 'Not sold after all? Put it back' : l.listedAt ? 'List it again' : 'Send it for review again'}
                        </button>
                    )}
                </div>
            </div>

            {(l.status === 'changes' || l.status === 'cancelled') && l.review && (
                <div className="mt-3 rounded-xl bg-clay-soft/70 px-3.5 py-3 text-[13px] text-clay">
                    <p className="font-bold">{l.status === 'cancelled' ? 'Why our team cancelled it' : 'What our team said'}</p>
                    <ul className="mt-1 space-y-0.5">
                        {(l.review.reasons || []).map((r) => (
                            <li key={r}>· {r}</li>
                        ))}
                    </ul>
                    {l.review.note && <p className="mt-1.5 text-ink-2">“{l.review.note}”</p>}
                </div>
            )}
        </div>
    );
}
