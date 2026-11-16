import React, { useEffect, useState } from 'react';
import { CITIES, FAMILIES, inchSize, inr, pieceInches, sqftOfInches } from '../lib/lots';
import { COLOUR_TAGS, FINISHES, shrinkPhoto, THICKNESSES, yard } from '../lib/vendor';
import { Check, Chip, Close } from './ui';
import { CameraIcon } from './RoomUpload';
import WhereItGoes from './WhereItGoes';
import { VideoField } from './StoneVideo';

const MAX_PHOTOS = 4;

/**
 * "List a lot", from the yard's phone: photos of the actual slabs, what the
 * stone is, how much there is, and the yard's price. It goes to our team for
 * review (#/review) and is on the site once approved.
 *
 * `editing`: a lot our team sent back. The form opens filled in, with what the
 * team said at the top, and sends it for review again.
 *
 * The preview under the price shows the yard what it gets, and what buyers will
 * see (our margin on top, and the part-lot rate), so nothing about the listing
 * is a surprise.
 */
export default function ListLotSheet({ account, catalogueNames = [], editing = null, onDone, onClose }) {
    const e0 = editing || {};
    const [photos, setPhotos] = useState(e0.photos || []);
    const [video, setVideo] = useState(e0.video || null); // { id, secs, type } in IndexedDB (lib/media.js)
    const [photoError, setPhotoError] = useState('');
    const [busyPhotos, setBusyPhotos] = useState(false);
    const [name, setName] = useState(e0.name || '');
    const [family, setFamily] = useState(e0.family || '');
    const [colors, setColors] = useState(e0.colors || []);
    const [sqft, setSqft] = useState(e0.sqft ? String(e0.sqft) : '');
    const [pieces, setPieces] = useState(e0.pieces ? String(e0.pieces) : '');
    // Piece size in inches, as the market measures a slab (area stays in sq ft).
    const [pieceL, setPieceL] = useState(() => String(pieceInches(e0)?.[0] || ''));
    const [pieceW, setPieceW] = useState(() => String(pieceInches(e0)?.[1] || ''));
    const [thicknessMm, setThickness] = useState(e0.thicknessMm || 18);
    const [finish, setFinish] = useState(e0.finish || FINISHES[0]);
    const [cityKey, setCityKey] = useState(e0.cityKey || account.profile?.cityKey || 'kishangarh');
    const [yardPrice, setYardPrice] = useState(e0.yardPrice ? String(e0.yardPrice) : '');
    const [marketRate, setMarketRate] = useState(e0.marketRate ? String(e0.marketRate) : '');
    const [tried, setTried] = useState(false);

    useEffect(() => {
        const onKey = (e) => e.key === 'Escape' && onClose();
        window.addEventListener('keydown', onKey);
        const prev = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            window.removeEventListener('keydown', onKey);
            document.body.style.overflow = prev;
        };
    }, [onClose]);

    const addPhotos = async (files) => {
        setPhotoError('');
        setBusyPhotos(true);
        try {
            const room = MAX_PHOTOS - photos.length;
            const shrunk = await Promise.all([...files].slice(0, room).map((f) => shrinkPhoto(f)));
            setPhotos((ps) => [...ps, ...shrunk].slice(0, MAX_PHOTOS));
            if (files.length > room) setPhotoError(`Up to ${MAX_PHOTOS} photos; the first is the one buyers see first.`);
        } catch (err) {
            setPhotoError(err.message);
        } finally {
            setBusyPhotos(false);
        }
    };

    const n = (v) => Math.max(0, Number(v) || 0);
    const price = n(yardPrice);
    const market = n(marketRate);
    const area = n(sqft);
    // How far the yard's own price is under market. The price buyers see is
    // set by our team at review (our margin on top), so it is not shown here.
    const off = price && market ? Math.round((1 - price / market) * 100) : null;
    const missing = [
        !photos.length && 'at least one photo',
        !name.trim() && 'the stone’s name',
        !family && 'the type of stone',
        !area && 'how many sq ft',
        !n(pieces) && 'how many pieces',
        !price && 'your price',
        !market && 'the usual market rate',
    ].filter(Boolean);

    const toggle = (list, v) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);
    const input = 'mt-1 w-full h-11 rounded-xl border border-ink/15 bg-white px-3 text-[14px] outline-none focus:border-ink';
    const label = 'text-[12px] font-semibold text-ink-3';

    return (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" role="dialog" aria-modal="true" aria-label="List a lot">
            <button className="absolute inset-0 bg-ink/45 backdrop-blur-[2px] scene-fade" onClick={onClose} aria-label="Close" />
            <div className="relative sheet-in bg-paper w-full md:w-[min(860px,94vw)] max-h-[94svh] md:max-h-[92vh] rounded-t-[26px] md:rounded-[26px] overflow-y-auto shadow-float">
                <div className="p-5 md:p-8 pr-14">
                    <p className="text-[12px] font-extrabold uppercase tracking-[0.18em] text-clay">{editing ? 'Fix and send again' : 'List a lot'}</p>
                    <h2 className="mt-1 font-brand text-[32px] md:text-[40px] leading-[1.04]">{editing ? editing.name : 'What have you got?'}</h2>
                    <p className="mt-1.5 text-[14px] text-ink-2">
                        Our team checks it, usually within a few hours, and then it goes live. Buyers see the stone, the size and the city, never your yard.
                    </p>
                    {editing?.review && (
                        <div className="mt-4 rounded-xl bg-clay-soft px-4 py-3 text-[13.5px] text-clay">
                            <p className="font-bold">What our team said</p>
                            <ul className="mt-1">
                                {(editing.review.reasons || []).map((r) => (
                                    <li key={r}>· {r}</li>
                                ))}
                            </ul>
                            {editing.review.note && <p className="mt-1 text-ink-2">“{editing.review.note}”</p>}
                        </div>
                    )}
                </div>

                <form
                    className="px-5 md:px-8 pb-6 md:pb-8 space-y-6"
                    onSubmit={(e) => {
                        e.preventDefault();
                        setTried(true);
                        if (missing.length) return;
                        const fields = {
                            name: name.trim(),
                            family,
                            colors,
                            photos,
                            video,
                            sqft: area,
                            pieces: n(pieces),
                            pieceLIn: n(pieceL) || null,
                            pieceWIn: n(pieceW) || null,
                            // Older listings kept the size in feet; a fixed one now has inches only.
                            pieceL: null,
                            pieceW: null,
                            thicknessMm,
                            finish,
                            cityKey,
                            yardPrice: price,
                            marketRate: market,
                        };
                        if (editing) {
                            yard.resubmit(editing.id, fields);
                            onDone({ ...editing, ...fields });
                        } else {
                            onDone(yard.addListing(fields));
                        }
                    }}
                >
                    {/* Photos of the actual slabs */}
                    <div>
                        <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-ink-3">Photos of the actual slabs</p>
                        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {photos.map((src, i) => (
                                <div key={src.slice(-40) + i} className="relative aspect-square rounded-xl overflow-hidden bg-paper-2">
                                    <img src={src} alt={`Photo ${i + 1}`} className="absolute inset-0 w-full h-full object-cover" />
                                    {i === 0 && (
                                        <span className="absolute left-1.5 top-1.5 rounded-md bg-ink/80 text-paper text-[10.5px] font-bold px-1.5 py-0.5">
                                            Cover
                                        </span>
                                    )}
                                    <button
                                        type="button"
                                        onClick={() => setPhotos((ps) => ps.filter((_, j) => j !== i))}
                                        aria-label={`Remove photo ${i + 1}`}
                                        className="absolute right-1.5 top-1.5 w-7 h-7 rounded-full bg-white/90 grid place-items-center"
                                    >
                                        <Close className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            ))}
                            {photos.length < MAX_PHOTOS && (
                                <label className="aspect-square rounded-xl border-2 border-dashed border-ink/20 bg-white/50 grid place-items-center text-center cursor-pointer hover:bg-white p-2">
                                    <span>
                                        <CameraIcon className="w-6 h-6 mx-auto text-ink-2" />
                                        <span className="mt-1 block text-[12.5px] font-bold">
                                            {busyPhotos ? 'Adding…' : photos.length ? 'Add more' : 'Add photos'}
                                        </span>
                                        <span className="block text-[11px] text-ink-3">Daylight, whole slab in frame</span>
                                    </span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        className="sr-only"
                                        onChange={(e) => {
                                            const files = [...(e.target.files || [])];
                                            e.target.value = '';
                                            if (files.length) addPhotos(files);
                                        }}
                                    />
                                </label>
                            )}
                        </div>
                        {photoError && <p className="mt-1.5 text-[12.5px] text-clay font-semibold">{photoError}</p>}
                    </div>

                    <VideoField video={video} onChange={setVideo} />

                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block sm:col-span-2">
                            <span className={label}>Stone name</span>
                            <input
                                list="yard-stone-names"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g. Statuario, Kota Blue, Black Galaxy"
                                className={input}
                            />
                            <datalist id="yard-stone-names">
                                {catalogueNames.map((s) => (
                                    <option key={s} value={s} />
                                ))}
                            </datalist>
                        </label>
                    </div>

                    <div>
                        <p className={label}>Type of stone</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {FAMILIES.map((f) => (
                                <Chip key={f} active={family === f} onClick={() => setFamily(f)}>
                                    {f}
                                </Chip>
                            ))}
                        </div>
                        {/* Where buyers will be offered it: marble, for one, is never a kitchen counter. */}
                        <WhereItGoes family={family} className="mt-2" />
                    </div>

                    <div>
                        <p className={label}>Colour (optional, helps buyers find it)</p>
                        <div className="mt-1.5 flex flex-wrap gap-1.5">
                            {COLOUR_TAGS.map((c) => (
                                <Chip key={c} active={colors.includes(c)} onClick={() => setColors((cs) => toggle(cs, c))}>
                                    {colors.includes(c) && <Check className="w-3 h-3" />}
                                    {c}
                                </Chip>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        <label className="block">
                            <span className={label}>Total stone</span>
                            <div className="flex items-center gap-1.5">
                                <input
                                    inputMode="numeric"
                                    value={sqft}
                                    onChange={(e) => setSqft(e.target.value.replace(/\D/g, ''))}
                                    className={input}
                                    aria-label="Total square feet"
                                />
                                <span className="mt-1 text-[13px] text-ink-2 whitespace-nowrap shrink-0">sq ft</span>
                            </div>
                        </label>
                        <label className="block">
                            <span className={label}>Pieces</span>
                            <input inputMode="numeric" value={pieces} onChange={(e) => setPieces(e.target.value.replace(/\D/g, ''))} className={input} />
                        </label>
                        <label className="block col-span-2">
                            <span className={label}>Size of a piece, in inches (optional)</span>
                            <div className="flex items-center gap-1.5">
                                <input
                                    inputMode="numeric"
                                    value={pieceL}
                                    onChange={(e) => setPieceL(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Length"
                                    className={input}
                                    aria-label="Piece length in inches"
                                />
                                <span className="mt-1 text-ink-3">×</span>
                                <input
                                    inputMode="numeric"
                                    value={pieceW}
                                    onChange={(e) => setPieceW(e.target.value.replace(/\D/g, ''))}
                                    placeholder="Width"
                                    className={input}
                                    aria-label="Piece width in inches"
                                />
                                <span className="mt-1 text-[13px] text-ink-2">in</span>
                            </div>
                            <PieceArea L={n(pieceL)} W={n(pieceW)} pieces={n(pieces)} total={area} />
                        </label>
                    </div>

                    <div className="grid sm:grid-cols-3 gap-4">
                        <label className="block">
                            <span className={label}>Thickness</span>
                            <select value={thicknessMm} onChange={(e) => setThickness(Number(e.target.value))} className={input}>
                                {THICKNESSES.map((t) => (
                                    <option key={t} value={t}>
                                        {t} mm
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className={label}>Finish</span>
                            <select value={finish} onChange={(e) => setFinish(e.target.value)} className={input}>
                                {FINISHES.map((f) => (
                                    <option key={f}>{f}</option>
                                ))}
                            </select>
                        </label>
                        <label className="block">
                            <span className={label}>Where the lot is</span>
                            <select value={cityKey} onChange={(e) => setCityKey(e.target.value)} className={input}>
                                {Object.entries(CITIES).map(([k, c]) => (
                                    <option key={k} value={k}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                            <span className={label}>Your price (what you get)</span>
                            <div className="flex items-center gap-1.5">
                                <span className="mt-1 text-[14px] text-ink-2">₹</span>
                                <input
                                    inputMode="numeric"
                                    value={yardPrice}
                                    onChange={(e) => setYardPrice(e.target.value.replace(/\D/g, ''))}
                                    className={input}
                                    aria-label="Your price per sq ft"
                                />
                                <span className="mt-1 text-[13px] text-ink-2 shrink-0">/sq ft</span>
                            </div>
                        </label>
                        <label className="block">
                            <span className={label}>What it usually sells for</span>
                            <div className="flex items-center gap-1.5">
                                <span className="mt-1 text-[14px] text-ink-2">₹</span>
                                <input
                                    inputMode="numeric"
                                    value={marketRate}
                                    onChange={(e) => setMarketRate(e.target.value.replace(/\D/g, ''))}
                                    className={input}
                                    aria-label="Usual market rate per sq ft"
                                />
                                <span className="mt-1 text-[13px] text-ink-2 shrink-0">/sq ft</span>
                            </div>
                        </label>
                    </div>

                    {price > 0 && (
                        <div className="rounded-2xl bg-white/80 border border-ink/10 p-4 text-[13.5px]">
                            <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-moss">You get</p>
                            <p className="mt-0.5">
                                <b className="text-[18px] tabular-nums">{inr(price)}/sq ft</b>
                                {area > 0 && <span className="text-ink-2"> · {inr(price * area)} for the whole lot</span>}
                            </p>
                            <p className="text-[12px] text-ink-3">
                                Always your price, paid when we collect the stone. We set the price buyers see when we review the lot.
                            </p>
                            {off !== null && (
                                <p className={`mt-1 text-[12px] font-semibold ${off >= 40 ? 'text-moss' : 'text-clay'}`}>
                                    {off > 0 ? `Your price is ${off}% under market.` : 'Your price is not under market.'}{' '}
                                    {off < 40 ? 'Lots sell fastest when buyers see 30% or more under market, so leave room for that.' : ''}
                                </p>
                            )}
                        </div>
                    )}

                    <div>
                        {tried && missing.length > 0 && (
                            <p className="mb-2 text-[13px] text-clay font-semibold" role="alert">
                                Still needed: {missing.join(', ')}.
                            </p>
                        )}
                        <button className="w-full h-12 rounded-full bg-ink text-paper font-bold text-[15px] hover:bg-ink/90">
                            {editing ? 'Send it again for review' : 'Send for review'}
                        </button>
                        <p className="mt-2 text-[12px] text-ink-3 text-center">
                            Once it is live you can mark it sold, or take it off, any time from My lots. We ask once a week if it is still available.
                        </p>
                    </div>
                </form>

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="absolute top-3 right-3 w-10 h-10 rounded-full bg-white/90 backdrop-blur grid place-items-center shadow-sm hover:bg-white"
                >
                    <Close />
                </button>
            </div>
        </div>
    );
}

/**
 * What a piece of L × W inches comes to in sq ft, and whether the pieces add
 * up to the total, so a size typed in feet by habit is caught at once.
 */
function PieceArea({ L, W, pieces, total }) {
    if (!L || !W) return <span className="mt-1 block text-[12px] text-ink-3">Measured in inches, like 72 × 48. The total stays in sq ft.</span>;
    if (L < 12 && W < 12)
        return (
            <span className="mt-1 block text-[12px] text-clay">
                That is under a foot each way. Sizes here are in inches: {L} ft is {L * 12} in.
            </span>
        );
    const each = sqftOfInches(L, W);
    const all = pieces ? each * pieces : null;
    const far = all && total ? Math.abs(all - total) / total > 0.25 : false;
    return (
        <span className={`mt-1 block text-[12px] tabular-nums ${far ? 'text-clay' : 'text-ink-3'}`}>
            {inchSize(L, W)} is {Math.round(each * 10) / 10} sq ft a piece
            {all ? ` · ${pieces} pieces ≈ ${Math.round(all)} sq ft` : ''}
            {far ? `, not the ${total} sq ft above. Check the size or the total.` : ''}
        </span>
    );
}
