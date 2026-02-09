import React, { useState, useRef, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion } from 'framer-motion'
import { useAuth } from './AuthContext'

const NAV_ITEMS = [
    { label: 'Films', href: '/' },
    { label: 'Abonnements', href: '/brunch' },
];

export default function Navbar() {
    const pathname = usePathname();
    const { adminAuthenticated, authenticated, handleLogout } = useAuth();

    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef(null);
    const [menuHeight, setMenuHeight] = useState(0);

    // Refs for measuring desktop link positions
    const navContainerRef = useRef(null);
    const linkRefs = useRef({});
    const [indicatorStyle, setIndicatorStyle] = useState({ left: 0, width: 0 });

    const isActive = (href) => {
        if (href === '/') return pathname === '/';
        return pathname.startsWith(href);
    };

    // Measure active link position and update indicator
    useEffect(() => {
        const activeItem = NAV_ITEMS.find(item => isActive(item.href));
        if (!activeItem || !linkRefs.current[activeItem.href] || !navContainerRef.current) return;

        const linkEl = linkRefs.current[activeItem.href];
        const containerEl = navContainerRef.current;
        const linkRect = linkEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        setIndicatorStyle({
            left: linkRect.left - containerRect.left + linkRect.width / 2 - 8,
            width: 16,
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pathname]);

    useEffect(() => {
        if (menuRef.current && menuOpen) {
            setMenuHeight(menuRef.current.scrollHeight);
        } else {
            setMenuHeight(0);
        }
    }, [menuOpen]);

    // Close mobile menu on resize to desktop
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth >= 768) setMenuOpen(false);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    // Close mobile menu on navigation
    useEffect(() => {
        setMenuOpen(false);
    }, [pathname]);

    const roleLabel = adminAuthenticated ? 'admin' : (authenticated ? 'utilisateur' : 'invité');

    return (
        <nav className="sticky top-0 z-50 bg-black/60 backdrop-blur-2xl border-b border-white/[0.06]">
            <div className="max-w-screen-xl mx-auto px-4 h-14 flex items-center justify-between md:justify-center">

                {/* ── Desktop nav ── */}
                <div ref={navContainerRef} className="hidden md:flex items-center gap-1 relative">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                ref={(el) => { linkRefs.current[item.href] = el; }}
                                prefetch={true}
                                className={`relative px-4 py-2 text-sm font-medium tracking-wide transition-colors duration-300 rounded-lg
                                    ${active
                                        ? 'text-white bg-white/10'
                                        : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                                    }
                                `}
                            >
                                {item.label}
                            </Link>
                        );
                    })}

                    {/* Animated active indicator */}
                    <motion.div
                        className="absolute bottom-0 h-[2px] rounded-full bg-orange pointer-events-none"
                        animate={{ left: indicatorStyle.left, width: indicatorStyle.width }}
                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    />

                    {/* Separator */}
                    <div className="w-px h-4 bg-white/10 mx-3" />

                    {/* Status + Logout */}
                    <span className="text-xs text-gray-500 mr-2">
                        {roleLabel}
                    </span>
                    <button
                        onClick={handleLogout}
                        className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded-lg border border-transparent hover:border-white/10 hover:bg-white/[0.04] transition-all duration-300 cursor-pointer"
                    >
                        Déconnexion
                    </button>
                </div>

                {/* ── Mobile: burger button (right-aligned) ── */}
                <div className="md:hidden flex items-center justify-end w-full">
                    <button 
                        type="button" 
                        className="inline-flex items-center justify-center p-2 w-10 h-10 text-gray-400 rounded-lg hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-700 transition-colors duration-200" 
                        aria-controls="navbar-mobile"
                        aria-expanded={menuOpen}
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        <span className="sr-only">Ouvrir le menu</span>
                        {/* Animated hamburger → X */}
                        <div className="relative w-5 h-4 flex flex-col justify-between">
                            <span className={`block h-0.5 w-full bg-current rounded transition-all duration-300 origin-center ${menuOpen ? 'rotate-45 translate-y-[7px]' : ''}`} />
                            <span className={`block h-0.5 w-full bg-current rounded transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
                            <span className={`block h-0.5 w-full bg-current rounded transition-all duration-300 origin-center ${menuOpen ? '-rotate-45 -translate-y-[7px]' : ''}`} />
                        </div>
                    </button>
                </div>
            </div>

            {/* ── Mobile: dropdown menu ── */}
            <div 
                ref={menuRef}
                id="navbar-mobile"
                className="md:hidden w-full overflow-hidden transition-all duration-300 ease-in-out"
                style={{ 
                    maxHeight: `${menuHeight}px`,
                    opacity: menuOpen ? 1 : 0
                }}
            >
                <ul className="flex flex-col font-medium px-4 pb-4 gap-2">
                    {NAV_ITEMS.map((item) => {
                        const active = isActive(item.href);
                        return (
                            <li key={item.href}>
                                {active ? (
                                    <a href="#" className="block py-2 px-3 text-white bg-gray-800 rounded-lg" aria-current="page">{item.label}</a>
                                ) : (
                                    <Link
                                        href={item.href}
                                        prefetch={true}
                                        className="block border border-gray-800 py-2 px-3 text-white rounded-lg bg-gray-900 hover:text-white hover:border-orange transition-colors"
                                    >
                                        {item.label}
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                    <div className='flex flex-row-reverse justify-start gap-4 my-4'>
                        <li>
                            <a onClick={handleLogout} className="block border border-gray-800 py-2 px-3 text-white rounded-lg bg-gray-900 hover:text-white hover:border-orange transition-colors text-xs w-fit cursor-pointer">Se déconnecter</a>
                        </li>
                        <li>
                            <p className="text-sm text-gray-400 py-2">
                                Connecté en tant que {roleLabel}
                            </p>
                        </li>
                    </div>
                </ul>
            </div>
        </nav>
    );
}
