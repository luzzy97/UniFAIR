import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#0c0c0c] text-white w-full pt-20 pb-12 border-t border-white/5 relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-px bg-gradient-to-r from-transparent via-emerald-500/20 to-transparent"></div>
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-16 md:gap-6 mb-16">
          
          <div className="w-full md:w-5/12 pr-0 md:pr-12">
            <Link href="/" className="inline-block mb-6 group">
              <img src="/rialo-text-logo.png" alt="Rialo Logo" className="h-8 w-auto opacity-80 group-hover:opacity-100 transition-opacity" />
            </Link>
            <p className="font-headline text-[13px] text-white/40 leading-relaxed max-w-sm">
              © 2026 Rialo. The architectural void of Layer 1. Engineered for scalability, precision, and the future of decentralized value exchange.
            </p>
          </div>

          <div className="w-full md:w-7/12 grid grid-cols-2 lg:grid-cols-3 gap-10 md:justify-items-end">
            <div className="flex flex-col gap-6">
              <h4 className="font-headline font-bold text-white uppercase text-[11px] tracking-[0.25em]">Platform</h4>
              <nav className="flex flex-col gap-4">
                {[['/', 'Home'], ['/swap', 'Swap'], ['/bridge', 'Bridge'], ['/staking', 'Staking'], ['/rewards', 'Rewards']].map(([href, label]) => (
                  <Link key={href} href={href} className="font-headline text-[12px] text-white/40 hover:text-emerald-500 transition-all duration-300 flex items-center group">
                    <span className="w-0 h-px bg-emerald-500 mr-0 transition-all duration-300 group-hover:w-3 group-hover:mr-2"></span>
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex flex-col gap-6">
              <h4 className="font-headline font-bold text-white uppercase text-[11px] tracking-[0.25em]">Resources</h4>
              <nav className="flex flex-col gap-4">
                {[['https://www.rialo.io/docs', 'Documentation'], ['#', 'Whitepaper'], ['/learn', 'Learn'], ['#', 'GitHub']].map(([href, label]) => (
                  <a 
                    key={label} 
                    href={href} 
                    target={href.startsWith('http') ? "_blank" : undefined}
                    rel={href.startsWith('http') ? "noopener noreferrer" : undefined}
                    className="font-headline text-[12px] text-white/40 hover:text-emerald-500 transition-all duration-300 flex items-center group"
                  >
                    <span className="w-0 h-px bg-emerald-500 mr-0 transition-all duration-300 group-hover:w-3 group-hover:mr-2"></span>
                    {label}
                  </a>
                ))}
              </nav>
            </div>

            <div className="hidden lg:flex flex-col gap-6">
              <h4 className="font-headline font-bold text-white uppercase text-[11px] tracking-[0.25em]">Contact</h4>
              <nav className="flex flex-col gap-4">
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
                    className="font-headline text-[12px] text-white/40 hover:text-emerald-500 transition-all duration-300 flex items-center group"
                  >
                    <span className="w-0 h-px bg-emerald-500 mr-0 transition-all duration-300 group-hover:w-3 group-hover:mr-2"></span>
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
