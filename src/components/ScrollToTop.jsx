import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

// On every route change, scroll the window back to the top.
// React Router preserves scroll position by default, which feels broken
// when switching between sibling pages (About / Stone Intelligence / Team).
const ScrollToTop = () => {
    const { pathname } = useLocation();
    useEffect(() => {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }, [pathname]);
    return null;
};

export default ScrollToTop;
