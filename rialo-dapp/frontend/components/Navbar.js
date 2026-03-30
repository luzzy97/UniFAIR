import React, { useState, useEffect, useRef, Fragment } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../hooks/useWallet';

export default function Navbar() {
  const { isConnected, shortAddress, connecting, connect, disconnect, isWrongNetwork, switchNetwork } = useWallet();
  const router = useRouter();
  const navRef = useRef(null);

  // true = background behind navbar is DARK -> show white logo/icons
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const detect = () => {
      const nav = navRef.current;
      if (!nav) return;

      // Make navbar invisible to pointer-events so elementFromPoint looks through it
      nav.style.pointerEvents = 'none';
      const midY = nav.getBoundingClientRect().bottom - 4;
      const el = document.elementFromPoint(window.innerWidth / 2, midY);
      nav.style.pointerEvents = '';

      if (!el) return;

      // Walk up DOM to find the first element with a real background color
      let node = el;
      while (node && node !== document.documentElement) {
        const bg = window.getComputedStyle(node).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          const nums = bg.match(/\d+/g);
          if (nums && nums.length >= 3) {
            const r = +nums[0], g = +nums[1], b = +nums[2];
            // Relative luminance formula
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            setIsDark(luminance < 0.5);
          }
          return;
        }
        node = node.parentElement;
      }
      setIsDark(false);
    };

    // Run on mount + route change + scroll
    detect();
    let rafId = null;
    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(detect);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [router.pathname]);

  const links = [
    { href: '/', label: 'Home' },
    { href: '/swap', label: 'Swap' },
    { href: '/bridge', label: 'Bridge' },
    { href: '/staking', label: 'Staking' },
    { href: '/rewards', label: 'Reward' },
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/ai', label: 'AI Agent' },
    { href: '/learn', label: 'Learn' },
  ];

  const WalletIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <circle cx="17" cy="14" r="1" fill="currentColor"/>
    </svg>
  );

  return (
    <>
      <style>{`
        .rialo-nav {
          position: sticky;
          top: 0;
          width: 100%;
          z-index: 50;
          background: transparent;
        }
        .nav-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          position: relative;
          padding: 14px 36px;
          max-width: 1440px;
          margin: 0 auto;
        }

        /* ── Logo ── */
        .logo-link {
          display: flex;
          align-items: center;
          text-decoration: none;
          transition: opacity 0.2s;
        }
        .logo-link:hover { opacity: 0.75; }
        .logo-img {
          height: 28px;
          width: auto;
        }
        /* dark bg → white logo | light bg → black logo */
        .logo-img.on-dark  { filter: brightness(0) invert(1); }
        .logo-img.on-light { filter: brightness(0); }

        /* ── Pill Nav ── */
        .nav-pill-wrap {
          display: none;
        }
        @media (min-width: 768px) {
          .nav-pill-wrap {
            display: flex;
            position: absolute;
            left: 50%;
            transform: translateX(-50%);
          }
        }
        .nav-pill {
          display: flex;
          align-items: center;
          background: #0e0e0f;
          border-radius: 9999px;
          padding: 5px 6px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.22), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          /* Match tighter Figma spacing: 8px-12px horizontal padding. Letter-spacing optical center fix kept on left limit. */
          padding: 8px 8px 8px calc(8px + 0.12em);
          border-radius: 9999px;
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          white-space: nowrap;
          transition: color 0.18s, background 0.18s;
        }
        .nav-link:hover {
          color: rgba(255,255,255,0.75);
          background: rgba(255,255,255,0.07);
        }
        .nav-link.active {
          color: #fff;
          background: rgba(255,255,255,0.11);
        }
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.45);
        }

        /* ── Right section ── */
        .nav-right { display: flex; align-items: center; gap: 8px; }

        /* ── Wallet Button ── */
        .wallet-btn {
          display: flex;
          align-items: center;
          gap: 7px;
          padding: 9px 20px;
          border-radius: 9999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          cursor: pointer;
          border: none;
          outline: none;
          white-space: nowrap;
          transition: transform 0.18s, box-shadow 0.18s, background 0.2s, color 0.2s;
        }
        .wallet-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .wallet-btn:not(:disabled):hover { transform: translateY(-1px); }

        /* dark bg → white button | light bg → black button */
        .wallet-btn.on-dark {
          background: #ffffff;
          color: #0e0e0f;
          box-shadow: 0 2px 14px rgba(255,255,255,0.14);
        }
        .wallet-btn.on-dark:not(:disabled):hover {
          box-shadow: 0 4px 22px rgba(255,255,255,0.22);
        }
        .wallet-btn.on-light {
          background: #0e0e0f;
          color: #ffffff;
          box-shadow: 0 2px 14px rgba(0,0,0,0.18);
        }
        .wallet-btn.on-light:not(:disabled):hover {
          box-shadow: 0 4px 22px rgba(0,0,0,0.28);
        }

        /* Connected state: green pulse dot */
        .wallet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          flex-shrink: 0;
          animation: pulse-dot 2s infinite;
        }
        @keyframes pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>

      <nav ref={navRef} className="rialo-nav">
        <div className="nav-inner">

          {/* Left: Logo */}
          <Link href="/" className="logo-link">
            <img
              src="/logo.svg"
              alt="Rialo Logo"
              className={`logo-img ${isDark ? 'on-dark' : 'on-light'}`}
            />
          </Link>

          {/* Center: Pill Nav */}
          <div className="nav-pill-wrap">
            <div className="nav-pill">
              {links.map(({ href, label }) => {
                const active = router.pathname === href;
                return (
                  <Fragment key={href}>
                    <Link
                      href={href}
                      className={`nav-link ${active ? 'active' : ''}`}
                    >
                      {label}
                    </Link>
                  </Fragment>
                );
              })}
            </div>
          </div>

          {/* Right: Wallet Button */}
          <div className="nav-right">
            {isConnected ? (
              isWrongNetwork ? (
                <button
                  id="switch-network-btn"
                  onClick={switchNetwork}
                  className="wallet-btn on-dark"
                  style={{ background: '#ef4444', color: '#fff', border: 'none' }}
                >
                  Switch to Sepolia
                </button>
              ) : (
                <button
                  id="disconnect-wallet-btn"
                  onClick={disconnect}
                  className={`wallet-btn ${isDark ? 'on-dark' : 'on-light'}`}
                >
                  <span className="wallet-dot" />
                  {shortAddress}
                </button>
              )
            ) : (
              <button
                id="connect-wallet-btn"
                onClick={connect}
                disabled={connecting}
                className={`wallet-btn ${isDark ? 'on-dark' : 'on-light'}`}
              >
                <WalletIcon />
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>

        </div>
      </nav>

      {/* Decorative divider below navbar */}
      {router.pathname === '/learn' && (
        <div style={{ width: '100%', lineHeight: 0, overflow: 'hidden', backgroundColor: '#ffffff' }}>
          <img
            src="/divider.png"
            alt=""
            style={{
              width: '100%',
              height: 'auto',
              display: 'block',
            }}
          />
        </div>
      )}
    </>
  );
}
