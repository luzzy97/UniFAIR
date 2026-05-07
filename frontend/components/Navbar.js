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
  const [showWalletMenu, setShowWalletMenu] = useState(false);

  useEffect(() => {
    const detect = () => {
      const nav = navRef.current;
      if (!nav) return;

      nav.style.pointerEvents = 'none';
      const midY = nav.getBoundingClientRect().bottom - 4;
      const el = document.elementFromPoint(window.innerWidth / 2, midY);
      nav.style.pointerEvents = '';

      if (!el) return;

      let node = el;
      while (node && node !== document.documentElement) {
        const bg = window.getComputedStyle(node).backgroundColor;
        if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
          const nums = bg.match(/\d+/g);
          if (nums && nums.length >= 3) {
            const r = +nums[0], g = +nums[1], b = +nums[2];
            const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
            setIsDark(luminance < 0.5);
          }
          return;
        }
        node = node.parentElement;
      }
      setIsDark(false);
    };

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
    { href: '/staking', label: 'Stake' }, // <-- SUDAH DIUBAH JADI STAKE SAJA
    { href: '/dashboard', label: 'UniHub' },
    { href: '/ai', label: 'AI Agent' },
    { href: '/learn', label: 'Learn' },
  ];

  const WalletIcon = () => (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
      strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z" />
      <circle cx="17" cy="14" r="1" fill="currentColor" />
    </svg>
  );

  return (
    <>
      <nav ref={navRef} className="rialo-nav">
        <div className="nav-inner">

          {/* Left: Logo */}
          <Link href="/" className="logo-link">
            <img
              src="/Animasi/img.18/un-removebg-preview.png"
              alt="UniFAIR Logo"
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
                  onClick={() => setShowWalletMenu(!showWalletMenu)}
                  className={`wallet-btn ${isDark ? 'on-dark' : 'on-light'}`}
                >
                  <span className="wallet-dot" />
                  {shortAddress}
                  <span className="material-symbols-outlined" style={{ fontSize: '14px', marginLeft: '2px' }}>expand_more</span>
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

            {showWalletMenu && isConnected && !isWrongNetwork && (
              <div className="wallet-dropdown">
                <button
                  className="disconnect-btn"
                  onClick={() => {
                    disconnect();
                    setShowWalletMenu(false);
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>logout</span>
                  Disconnect
                </button>
              </div>
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