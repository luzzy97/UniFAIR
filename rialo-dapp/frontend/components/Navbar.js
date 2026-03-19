import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../hooks/useWallet';

export default function Navbar() {
  const { isConnected, shortAddress, connecting, connect, disconnect } = useWallet();
  const router = useRouter();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isHomePage = router.pathname === '/';
  const isDarkTheme = isHomePage && !isScrolled;

  const links = [
    { href: '/', label: 'Home' },
    { href: '/swap', label: 'Swap' },
    { href: '/bridge', label: 'Bridge' },
    { href: '/staking', label: 'Staking' },
    { href: '/rewards', label: 'Reward' },
    { href: '/learn', label: 'Learn' },
  ];

  const DiscordIcon = () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.069.069 0 0 0-.032.027C.533 9.048-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.06.06 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.419-2.157 2.419zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.419-2.157 2.419z"/>
    </svg>
  );

  const TelegramIcon = () => (
    <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0C5.346 0 0 5.346 0 11.944c0 6.598 5.346 11.944 11.944 11.944 6.598 0 11.944-5.346 11.944-11.944C23.888 5.346 18.542 0 11.944 0zm5.201 8.243l-1.815 8.56c-.137.6-.492.748-.996.467l-2.763-2.035-1.333 1.282c-.147.147-.271.271-.557.271l.198-2.81 5.115-4.619c.222-.198-.048-.308-.344-.112l-6.321 3.98-2.723-.85c-.593-.185-.605-.593.123-.878l10.643-4.102c.493-.185.924.111.77 1.006z"/>
    </svg>
  );

  const XIcon = () => (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
    </svg>
  );

  const WalletIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
      <path d="M16 3l-4 4-4-4"/>
      <circle cx="17" cy="14" r="1" fill="currentColor"/>
    </svg>
  );

  const socialLinks = [
    { label: 'Discord', href: '#', Icon: DiscordIcon },
    { label: 'Telegram', href: '#', Icon: TelegramIcon },
    { label: 'X', href: '#', Icon: XIcon },
  ];

  return (
    <>
      <style>{`
        .rialo-nav {
          position: sticky;
          top: 0;
          width: 100%;
          z-index: 50;
          transition: background 0.35s ease, box-shadow 0.35s ease;
        }
        .rialo-nav.light {
          background: transparent;
          border-bottom: 1px solid transparent;
          box-shadow: none;
        }
        .rialo-nav.dark {
          background: transparent;
          border-bottom: 1px solid transparent;
          box-shadow: none;
        }

        /* Pill container */
        .nav-pill {
          display: flex;
          align-items: center;
          gap: 0;
          background: #0e0e0f;
          border-radius: 9999px;
          padding: 6px 8px;
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 4px 24px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.06);
        }
        .nav-pill.dark-theme {
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.14);
          box-shadow: 0 4px 24px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08);
        }

        /* Nav link */
        .nav-link {
          position: relative;
          display: flex;
          align-items: center;
          padding: 8px 18px;
          border-radius: 9999px;
          font-size: 10.5px;
          font-weight: 700;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.35);
          text-decoration: none;
          transition: color 0.2s ease, background 0.2s ease;
          white-space: nowrap;
        }
        .nav-link:hover {
          color: rgba(255,255,255,0.72);
          background: rgba(255,255,255,0.06);
        }
        .nav-link.active {
          color: #ffffff;
          background: rgba(255,255,255,0.10);
        }
        .nav-link.active::after {
          content: '';
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 2px;
          border-radius: 2px;
          background: rgba(255,255,255,0.5);
        }

        /* Logo */
        .logo-text {
          font-family: 'Manrope', sans-serif;
          font-weight: 800;
          font-size: 20px;
          letter-spacing: -0.02em;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 9px;
          transition: opacity 0.2s;
        }
        .logo-text:hover { opacity: 0.8; }
        .logo-text.light { color: #ffffff; }
        .logo-text.dark  { color: #ffffff; }
        .logo-img {
          height: 28px;
          width: auto;
          transition: filter 0.3s;
        }
        .logo-img.light { filter: brightness(0); }
        .logo-img.dark  { filter: brightness(0) invert(1); }

        /* Social icons */
        .social-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 36px;
          height: 36px;
          border-radius: 50%;
          transition: background 0.2s, color 0.2s, transform 0.2s;
          text-decoration: none;
        }
        .social-icon.light {
          color: rgba(255,255,255,0.45);
        }
        .social-icon.dark {
          color: rgba(255,255,255,0.45);
        }
        .social-icon:hover {
          transform: scale(1.12);
        }
        .social-icon.light:hover {
          color: rgba(255,255,255,0.95);
          background: rgba(255,255,255,0.10);
        }
        .social-icon.dark:hover {
          color: rgba(255,255,255,0.95);
          background: rgba(255,255,255,0.10);
        }

        /* Divider between socials and wallet */
        .nav-divider {
          width: 1px;
          height: 22px;
          margin: 0 6px;
          border-radius: 2px;
        }
        .nav-divider.light { background: rgba(255,255,255,0.12); }
        .nav-divider.dark  { background: rgba(255,255,255,0.12); }

        /* Wallet button */
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
          transition: transform 0.18s ease, box-shadow 0.18s ease, background 0.2s ease;
          white-space: nowrap;
        }
        .wallet-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .wallet-btn:not(:disabled):hover { transform: translateY(-1px); }

        .wallet-btn.light {
          background: #ffffff;
          color: #0e0e0f;
          box-shadow: 0 2px 12px rgba(255,255,255,0.12);
        }
        .wallet-btn.light:not(:disabled):hover {
          background: #f0f0f0;
          box-shadow: 0 4px 20px rgba(255,255,255,0.2);
        }
        .wallet-btn.dark {
          background: #ffffff;
          color: #0e0e0f;
          box-shadow: 0 2px 12px rgba(255,255,255,0.12);
        }
        .wallet-btn.dark:not(:disabled):hover {
          background: #f0f0f0;
          box-shadow: 0 4px 20px rgba(255,255,255,0.2);
        }

        .wallet-btn.connected.light {
          background: rgba(255,255,255,0.12);
          color: #ffffff;
        }
        .wallet-btn.connected.dark {
          background: #ffffff;
          color: #0e0e0f;
        }

        /* Pulse dot for connected state */
        .wallet-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 0 0 rgba(34,197,94,0.5);
          animation: pulse-dot 2s infinite;
          flex-shrink: 0;
        }
        @keyframes pulse-dot {
          0%   { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70%  { box-shadow: 0 0 0 5px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }

        .nav-inner {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 36px;
          max-width: 1440px;
          margin: 0 auto;
        }

        .nav-right {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .nav-socials {
          display: none;
          align-items: center;
        }
        @media (min-width: 1024px) {
          .nav-socials { display: flex; }
        }
        .nav-pill-wrap {
          display: none;
        }
        @media (min-width: 768px) {
          .nav-pill-wrap { display: flex; }
        }
      `}</style>

      <nav className={`rialo-nav ${isDarkTheme ? 'dark' : 'light'}`}>
        <div className="nav-inner">

          {/* Left: Logo */}
          <Link href="/" className={`logo-text ${isDarkTheme ? 'dark' : 'light'}`}>
            <img
              src="/logo.svg"
              alt="Rialo Logo"
              className={`logo-img ${isDarkTheme ? 'dark' : 'light'}`}
            />
          </Link>

          {/* Center: Pill Nav */}
          <div className="nav-pill-wrap">
            <div className={`nav-pill ${isDarkTheme ? 'dark-theme' : ''}`}>
              {links.map(({ href, label }) => {
                const active = router.pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={`nav-link ${active ? 'active' : ''}`}
                  >
                    {label}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Right: Socials + Wallet */}
          <div className="nav-right">



            {isConnected ? (
              <button
                id="disconnect-wallet-btn"
                onClick={disconnect}
                className={`wallet-btn connected ${isDarkTheme ? 'dark' : 'light'}`}
              >
                <span className="wallet-dot" />
                {shortAddress}
              </button>
            ) : (
              <button
                id="connect-wallet-btn"
                onClick={connect}
                disabled={connecting}
                className={`wallet-btn ${isDarkTheme ? 'dark' : 'light'}`}
              >
                <WalletIcon />
                {connecting ? 'Connecting…' : 'Connect Wallet'}
              </button>
            )}
          </div>

        </div>
      </nav>
    </>
  );
}
