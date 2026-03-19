import Link from 'next/link';
import { useRouter } from 'next/router';
import { useWallet } from '../hooks/useWallet';

export default function Navbar() {
  const { isConnected, shortAddress, connecting, connect, disconnect } = useWallet();
  const router = useRouter();

  const links = [
    { href: '/', label: 'Home' },
    { href: '/swap', label: 'Swap' },
    { href: '/bridge', label: 'Bridge' },
    { href: '/staking', label: 'Staking' },
    { href: '/rewards', label: 'Reward' },
    { href: '/learn', label: 'Learn' },
  ];

  return (
    <nav className="sticky top-0 w-full z-50 glass-nav transition-all duration-300">
      <div className="flex justify-between items-center px-8 py-4 max-w-[1440px] mx-auto">
        <Link href="/" className="flex items-center gap-2">
          <img 
            src="/logo.svg" 
            alt="Rialo Logo" 
            className="h-8 w-auto brightness-0" 
          />
        </Link>

        <div className="hidden md:flex bg-black rounded-full px-10 py-4 gap-10 items-center shadow-2xl">
          {links.map(({ href, label }) => {
            const active = router.pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={`text-[11px] font-bold uppercase tracking-[0.2em] transition-all hover:opacity-100 ${
                  active ? 'text-white opacity-100' : 'text-white/40 opacity-40'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-4">
          {isConnected ? (
            <button
              onClick={disconnect}
              className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-black/80"
            >
              {shortAddress}
            </button>
          ) : (
            <button
              onClick={connect}
              disabled={connecting}
              className="bg-black text-white px-6 py-2.5 rounded-full font-bold text-[10px] uppercase tracking-widest transition-all hover:bg-black/80 disabled:opacity-50"
            >
              {connecting ? 'Connecting…' : 'Connect'}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
}
