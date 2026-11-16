import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Hero from './components/Hero';
import Gallery from './components/Gallery';
import LotSheet from './components/LotSheet';
import Studio from './components/Studio';
import CompareSheet from './components/CompareSheet';
import ContactSheet from './components/ContactSheet';
import DirectSheet from './components/DirectSheet';
import LoginSheet from './components/LoginSheet';
import ProjectSheet from './components/ProjectSheet';
import RequirementSheet from './components/RequirementSheet';
import RoomDesigner from './components/RoomDesigner';
import VendorPortal from './components/VendorPortal';
import ReviewQueue from './components/ReviewQueue';
import { ContactBand, Footer, ForYards, HowItWorks, JustListed, Nav, Regions, ShopBySpace } from './components/Sections';
import { useSaved } from './lib/hooks';
import { fetchLots, lotFromListing } from './lib/lots';
import { useYard } from './lib/vendor';
import { fetchRenders, fetchTour } from './lib/renders';

// Views live in the hash so Back works and a link can be shared:
//   #/         the landing room + sections
//   #/lots     the full gallery
//   #/studio   team page: render lots into rooms with the live visualiser
//   #/design   design a room: several stones on several surfaces, one render
//   #/yards    the yard portal: log in, get verified, list lots, mark them sold
//   #/review   team page: approve the lots yards send, or send them back
const readView = () => {
    const h = window.location.hash;
    if (h.startsWith('#/yards')) return 'yards';
    if (h.startsWith('#/review')) return 'review';
    if (h.startsWith('#/lots')) return 'gallery';
    if (h.startsWith('#/studio')) return 'studio';
    if (h.startsWith('#/design')) return 'design';
    return 'home';
};

const USER_KEY = 'ston-lots-user';
const NOTHING_SAVED = new Set();

export default function App() {
    // The catalogue's sample lots, from Supabase.
    const [catalogueLots, setLots] = useState([]);
    // Lots yards listed in the portal: live ones are on the site with the rest,
    // first; one marked sold or withdrawn drops out of every view at once.
    const { listings } = useYard();
    const yardLots = useMemo(() => listings.filter((l) => l.status === 'live').map(lotFromListing), [listings]);
    const lots = useMemo(() => [...yardLots, ...catalogueLots], [yardLots, catalogueLots]);
    const catalogueNames = useMemo(() => [...new Set(catalogueLots.map((l) => l.name))].sort(), [catalogueLots]);
    // { [lotId]: { name, bathroom?: url, kitchen?: url, … } }
    const [renders, setRenders] = useState({});
    // The hero's default run: [{ lotId, scene, style }] (see renders.js).
    const [tour, setTour] = useState([]);
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState('');
    const [view, setView] = useState(readView);
    // Newest first: a lot a yard just listed (and our team approved) is at the top,
    // not pages down among 229 sorted by saving.
    const [filters, setFilters] = useState({ sort: 'newest' });
    const [open, setOpen] = useState(null); // { lot, initial }
    const [saved, toggleSaved] = useSaved();
    // Saving lots needs an account. Demo login (LoginSheet), kept for this tab.
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(sessionStorage.getItem(USER_KEY) || 'null');
        } catch {
            return null;
        }
    });
    // "Plan a whole project" (ProjectSheet) open.
    const [project, setProject] = useState(false);
    // { reason: 'save' | 'saved', then } while the login sheet is open.
    const [login, setLogin] = useState(null);
    // Logged out, nothing shows as saved.
    const visibleSaved = user ? saved : NOTHING_SAVED;
    // Compare: pick two lots in the gallery, see them in one room with a slider.
    // `ownRoom`: open the comparison in the buyer's own room photo.
    const [compare, setCompare] = useState({
        on: false,
        picks: [],
        open: false,
        ownRoom: false,
    });
    // A photo of the buyer's own room. Memory only: uploaded once, tried with
    // lot after lot, gone when the tab closes. Never written anywhere.
    const [ownPhoto, setOwnPhoto] = useState(null);
    // "Share your requirement": open with an optional { space, sqft } prefill.
    const [requirement, setRequirement] = useState(null);
    // What the room designer opens with: { lotId, surfaceId } from a lot page.
    const [designPrefill, setDesignPrefill] = useState(null);
    // Design a room asked for a stone from the gallery: { n, label, color, kind,
    // avoid, apply }. The designer stays mounted (hidden) until it comes back.
    const [designPick, setDesignPick] = useState(null);
    // "Talk to us": { lot?, focus? } (see ContactSheet).
    const [contact, setContact] = useState(null);
    // "Buy direct from the yard": the lot whose yard details are on offer.
    const [direct, setDirect] = useState(null);

    useEffect(() => {
        let alive = true;
        Promise.all([fetchLots(), fetchRenders(), fetchTour()])
            .then(([l, r, t]) => {
                if (!alive) return;
                setLots(l);
                setRenders(r);
                setTour(t);
                setStatus('ready');
            })
            .catch((e) => {
                if (!alive) return;
                setError(e.message || String(e));
                setStatus('error');
            });
        return () => {
            alive = false;
        };
    }, []);

    useEffect(() => {
        const on = () => {
            const v = readView();
            setView(v);
            // Back in Design a room, or anywhere else, the stone pick is over. Only
            // here: cleared any earlier, the gallery would render without it for a
            // moment and Design a room (kept alive for it) would be dropped.
            if (v !== 'gallery') setDesignPick(null);
        };
        window.addEventListener('hashchange', on);
        return () => window.removeEventListener('hashchange', on);
    }, []);

    const goGallery = useCallback((patch) => {
        setFilters((f) => ({ sort: f.sort || 'newest', ...(patch || {}) }));
        if (readView() !== 'gallery') window.location.hash = '#/lots';
        window.scrollTo({ top: 0 });
    }, []);
    const goHome = useCallback(() => {
        if (readView() !== 'home') window.location.hash = '#/';
    }, []);
    const openLot = useCallback((lot, initial) => setOpen({ lot, initial }), []);
    const closeLot = useCallback(() => setOpen(null), []);
    const toggleCompare = useCallback(() => setCompare((c) => (c.on ? { on: false, picks: [], open: false, ownRoom: false } : { ...c, on: true })), []);
    // As on the live site: choosing the second lot IS the request to compare.
    const pickCompare = useCallback(
        (lot) =>
            setCompare((c) => {
                const already = c.picks.some((p) => p.id === lot.id);
                const picks = already ? c.picks.filter((p) => p.id !== lot.id) : c.picks.length >= 2 ? [c.picks[1], lot] : [...c.picks, lot];
                return {
                    ...c,
                    picks,
                    open: !already && c.picks.length < 2 && picks.length === 2,
                };
            }),
        [],
    );
    // From a lot page: that lot is the first pick, the gallery finds the second.
    // Started from the lot's "Your room" view, the comparison opens in that room.
    const compareFrom = useCallback(
        (lot, opts) => {
            setOpen(null);
            setCompare({
                on: true,
                picks: [lot],
                open: false,
                ownRoom: !!opts?.ownRoom,
            });
            goGallery();
        },
        [goGallery],
    );
    const closeCompare = useCallback(() => setCompare((c) => ({ ...c, open: false })), []);
    const openRequirement = useCallback((prefill) => setRequirement(prefill || {}), []);
    const openDesigner = useCallback((prefill) => {
        setOpen(null);
        setDesignPrefill(prefill || null);
        if (readView() !== 'design') window.location.hash = '#/design';
        window.scrollTo({ top: 0 });
    }, []);
    const pickForDesign = useCallback((req) => {
        setDesignPick(req);
        window.location.hash = '#/lots';
        window.scrollTo({ top: 0 });
    }, []);
    const finishDesignPick = useCallback(
        (lot) => {
            if (lot) designPick?.apply(lot.id);
            window.location.hash = '#/design';
            window.scrollTo({ top: 0 });
        },
        [designPick],
    );
    const closeRequirement = useCallback(() => setRequirement(null), []);
    const openContact = useCallback((c) => setContact(c || {}), []);
    const closeContact = useCallback(() => setContact(null), []);
    const closeDirect = useCallback(() => setDirect(null), []);
    const closeLogin = useCallback(() => setLogin(null), []);
    // A tap on a heart: saves, or asks to log in first and then saves.
    // After logging in it only ever saves: the heart looked empty, so the buyer meant "save".
    const saveLot = useCallback(
        (id) =>
            user
                ? toggleSaved(id)
                : setLogin({
                      reason: 'save',
                      then: () => !saved.has(id) && toggleSaved(id),
                  }),
        [user, saved, toggleSaved],
    );
    const openSaved = useCallback(
        () =>
            user
                ? goGallery({ savedOnly: true })
                : setLogin({
                      reason: 'saved',
                      then: () => goGallery({ savedOnly: true }),
                  }),
        [user, goGallery],
    );
    const logIn = useCallback(
        (u) => {
            setUser(u);
            try {
                sessionStorage.setItem(USER_KEY, JSON.stringify(u));
            } catch {
                /* storage unavailable: logged in until the page reloads */
            }
            const then = login?.then;
            setLogin(null);
            then?.();
        },
        [login],
    );
    const logOut = useCallback(() => {
        setUser(null);
        try {
            sessionStorage.removeItem(USER_KEY);
        } catch {
            /* nothing stored */
        }
    }, []);
    // A render made on a lot page or in the studio shows up everywhere at once.
    const addRender = useCallback(
        (lot, sceneId, url) =>
            setRenders((r) => ({
                ...r,
                [lot.id]: { ...(r[lot.id] || {}), name: lot.name, [sceneId]: url },
            })),
        [],
    );

    return (
        <div className="min-h-screen bg-paper text-ink font-ui">
            {view !== 'yards' && view !== 'review' && (
                <Nav
                    onHome={goHome}
                    onBrowse={() => goGallery()}
                    savedCount={visibleSaved.size}
                    onSaved={openSaved}
                    user={user}
                    onLogout={logOut}
                    onRequirement={() => openRequirement()}
                    onDesign={() => openDesigner()}
                    onContact={() => openContact()}
                    solid={view !== 'home'}
                />
            )}

            {view === 'review' && (
                <ReviewQueue
                    onHome={goHome}
                    onViewLot={(id) => {
                        const lot = lots.find((l) => l.id === id);
                        if (!lot) return;
                        window.location.hash = '#/';
                        openLot(lot);
                    }}
                />
            )}

            {view === 'yards' && (
                <VendorPortal
                    catalogueNames={catalogueNames}
                    onHome={goHome}
                    onViewLot={(id) => {
                        const lot = lots.find((l) => l.id === id);
                        if (!lot) return;
                        window.location.hash = '#/';
                        openLot(lot);
                    }}
                />
            )}

            {status === 'error' && view !== 'yards' && view !== 'review' && (
                <div className="pt-28 px-6 max-w-xl mx-auto text-center">
                    <p className="font-brand text-[32px]">Couldn&apos;t reach the stone database.</p>
                    <p className="mt-2 text-ink-2 text-[14px]">{error}</p>
                </div>
            )}

            {status === 'loading' && view !== 'yards' && view !== 'review' && (
                <div className="h-[100svh] grid place-items-center">
                    <p className="text-ink-3 font-semibold animate-pulse">Loading live lots…</p>
                </div>
            )}

            {status === 'ready' && view === 'home' && (
                <main>
                    <Hero lots={lots} renders={renders} tour={tour} totalLots={lots.length} onOpenLot={openLot} paused={!!open} />
                    <HowItWorks lots={lots} />
                    <ShopBySpace lots={lots} renders={renders} onPick={(space, pin) => goGallery({ space, pin })} onOpenLot={openLot} />
                    <Regions lots={lots} onPick={(city, pin) => goGallery({ city, pin })} onOpenLot={openLot} />
                    <JustListed lots={lots} renders={renders} saved={visibleSaved} onToggleSave={saveLot} onOpen={openLot} onBrowse={() => goGallery()} />
                    <ContactBand
                        onRequirement={openRequirement}
                        onContact={(focus) => openContact({ focus })}
                        onBrowse={() => goGallery()}
                        onProject={() => setProject(true)}
                    />
                    <ForYards onOpen={() => (window.location.hash = '#/yards')} />
                    <Footer />
                </main>
            )}

            {status === 'ready' && view === 'gallery' && (
                <main>
                    <Gallery
                        lots={lots}
                        renders={renders}
                        filters={filters}
                        setFilters={setFilters}
                        saved={visibleSaved}
                        onToggleSave={saveLot}
                        onOpenSaved={openSaved}
                        onOpen={openLot}
                        onHome={goHome}
                        compare={compare}
                        onToggleCompare={toggleCompare}
                        onPickCompare={pickCompare}
                        onOpenCompare={() => setCompare((c) => ({ ...c, open: true }))}
                        onRequirement={openRequirement}
                        designPick={designPick}
                        onDesignPick={finishDesignPick}
                        onCancelDesignPick={() => finishDesignPick(null)}
                    />
                    <Footer />
                </main>
            )}

            {status === 'ready' && (view === 'design' || (view === 'gallery' && designPick)) && (
                <main hidden={view !== 'design'}>
                    <RoomDesigner
                        key={designPrefill ? `${designPrefill.lotId}-${designPrefill.surfaceId}` : 'blank'}
                        lots={lots}
                        renders={renders}
                        tour={tour}
                        ownPhoto={ownPhoto}
                        setOwnPhoto={setOwnPhoto}
                        prefill={designPrefill}
                        onOpenLot={openLot}
                        onPickStone={pickForDesign}
                        onHome={goHome}
                    />
                    <Footer />
                </main>
            )}

            {status === 'ready' && view === 'studio' && (
                <main>
                    <Studio lots={lots} renders={renders} onRendered={addRender} onTourSaved={setTour} onHome={goHome} />
                </main>
            )}

            {open && (
                <LotSheet
                    key={`lot-${open.lot.id}${open.initial?.reserve ? '-reserve' : ''}`}
                    lot={open.lot}
                    initial={open.initial}
                    renders={renders}
                    onRendered={addRender}
                    saved={visibleSaved.has(open.lot.id)}
                    onToggleSave={saveLot}
                    onCompare={compareFrom}
                    onDesign={openDesigner}
                    onContact={(focus) => openContact({ lot: open.lot, focus })}
                    onDirect={(lot) => setDirect(lot)}
                    ownPhoto={ownPhoto}
                    setOwnPhoto={setOwnPhoto}
                    onClose={closeLot}
                />
            )}

            {requirement && (
                <RequirementSheet
                    lots={lots}
                    prefill={requirement}
                    onOpenLot={(lot, initial) => {
                        closeRequirement();
                        openLot(lot, initial);
                    }}
                    onSeeAll={(f) => {
                        closeRequirement();
                        goGallery(f);
                    }}
                    onClose={closeRequirement}
                />
            )}

            {contact && (
                <ContactSheet
                    lot={contact.lot}
                    focus={contact.focus}
                    onRequirement={(prefill) => {
                        closeContact();
                        openRequirement(prefill);
                    }}
                    onDirect={(lot) => {
                        closeContact();
                        setDirect(lot);
                    }}
                    onBrowse={() => {
                        closeContact();
                        setOpen(null);
                        goGallery();
                    }}
                    onProject={() => {
                        closeContact();
                        setProject(true);
                    }}
                    onClose={closeContact}
                />
            )}

            {project && <ProjectSheet onClose={() => setProject(false)} />}

            {login && <LoginSheet reason={login.reason} onDone={logIn} onClose={closeLogin} />}

            {direct && (
                <DirectSheet
                    // Prefixed: siblings of the lot sheet, whose key is also the lot's id.
                    key={`direct-${direct.id}`}
                    lot={direct}
                    onReserve={() => {
                        closeDirect();
                        openLot(direct, { reserve: true });
                    }}
                    onClose={closeDirect}
                />
            )}

            {compare.open && compare.picks.length === 2 && (
                <CompareSheet
                    key={compare.picks.map((p) => p.id).join('|')}
                    a={compare.picks[0]}
                    b={compare.picks[1]}
                    renders={renders}
                    onRendered={addRender}
                    ownPhoto={ownPhoto}
                    setOwnPhoto={setOwnPhoto}
                    startInOwnRoom={compare.ownRoom}
                    onOpenLot={(lot) => {
                        closeCompare();
                        openLot(lot);
                    }}
                    onClose={closeCompare}
                />
            )}
        </div>
    );
}
