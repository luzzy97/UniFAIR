import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0c0c0c] text-white w-full pt-12 pb-8 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-12 mb-10">
          
          <div className="w-full md:w-5/12">
            <Link href="/" className="inline-block mb-4 group">
              <img src="/rialo-text-logo.png" alt="Rialo Logo" className="h-10 w-auto filter brightness-0 invert opacity-80 group-hover:opacity-100 transition-opacity" />
            </Link>
            <p className="font-headline text-[11px] text-white/40 leading-relaxed max-w-sm font-medium">
              © 2026 Rialo. The architectural void of Layer 1. Engineered for scalability, precision, and the future of decentralized value exchange.
            </p>
          </div>

          <div className="w-full md:w-7/12 grid grid-cols-2 lg:grid-cols-3 gap-8 md:justify-items-end">
            <div className="flex flex-col gap-3">
              <h4 className="font-headline font-extrabold text-white uppercase text-[10px] tracking-[0.2em] opacity-50">Platform</h4>
              <nav className="flex flex-col gap-2">
                {[['/', 'Home'], ['/swap', 'Swap'], ['/bridge', 'Bridge'], ['/staking', 'Staking'], ['/rewards', 'Rewards']].map(([href, label]) => (
                  <Link key={href} href={href} className="font-headline text-[13px] text-white/40 hover:text-white transition-all duration-300 flex items-center group font-medium">
                    <span className="w-0 h-px bg-white/40 mr-0 transition-all duration-300 group-hover:w-3 group-hover:mr-2"></span>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex flex-col gap-3">
              <h4 className="font-headline font-extrabold text-white uppercase text-[10px] tracking-[0.2em] opacity-50">Resources</h4>
              <nav className="flex flex-col gap-2">
                {[['https://www.rialo.io/docs', 'Documentation'], ['#', 'Whitepaper'], ['/learn', 'Learn'], ['#', 'GitHub']].map(([href, label]) => (
                  <a 
                    key={label} 
                    href={href} 
                    target={href.startsWith('http') ? "_blank" : undefined}
                    rel={href.startsWith('http') ? "noopener noreferrer" : undefined}
                    className="font-headline text-[13px] text-white/40 hover:text-white transition-all duration-300 flex items-center group font-medium"
                  >
                    <span className="w-0 h-px bg-white/40 mr-0 transition-all duration-300 group-hover:w-3 group-hover:mr-2"></span>
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="hidden lg:flex flex-col gap-3">
              <h4 className="font-headline font-extrabold text-white uppercase text-[10px] tracking-[0.2em] opacity-50">Contact</h4>
              <nav className="flex flex-col gap-2">
                {[
                  ['https://x.com/RialoHQ', 'X / Twitter'],
                  ['https://discord.com/invite/RialoProtocol', 'Discord'],
                  ['https://t.me/rialoprotocol', 'Telegram']
                ].map(([href, label]) => (
                  <a 
                    key={label} 
                    href={href} 
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-headline text-[13px] text-white/40 hover:text-white transition-all duration-300 flex items-center group font-medium"
                  >
                    <span className="w-0 h-px bg-white/40 mr-0 transition-all duration-300 group-hover:w-3 group-hover:mr-2"></span>
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
