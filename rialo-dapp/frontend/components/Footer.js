import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#000000] text-white w-full pt-10 pb-6 border-t border-white/5">
      <div className="max-w-[1200px] mx-auto px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between gap-10 md:gap-6 mb-8">
          
          <div className="w-full md:w-5/12 pr-0 md:pr-8">
            <Link href="/" className="inline-block mb-4">
              <img src="/logo.svg" alt="Rialo Logo" className="h-6 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            </Link>
            <p className="font-headline text-[11px] text-[#A1A1AA] leading-relaxed max-w-sm">
              © 2025 Rialo. The architectural void of Layer 1. Engineered for scalability, precision, and the future of decentralized value exchange.
            </p>
          </div>

          <div className="w-full md:w-7/12 flex flex-row justify-between md:justify-end md:gap-24">
            <div className="flex flex-col gap-4">
              <h4 className="font-headline font-bold text-white uppercase text-[10px] tracking-[0.2em]">Platform</h4>
              <nav className="flex flex-col gap-3">
                {[['/', 'Home'], ['/staking', 'Staking'], ['/rewards', 'Rewards'], ['/swap', 'Swap']].map(([href, label]) => (
                  <Link key={href} href={href} className="font-headline text-[11px] text-[#A1A1AA] hover:text-white transition-colors duration-200">
                    {label}
                  </Link>
                ))}
              </nav>
            </div>
            
            <div className="flex flex-col gap-4">
              <h4 className="font-headline font-bold text-white uppercase text-[10px] tracking-[0.2em]">Resources</h4>
              <nav className="flex flex-col gap-3">
                {[['#', 'Documentation'], ['#', 'Whitepaper'], ['/learn', 'Learn'], ['#', 'GitHub']].map(([href, label]) => (
                  <a key={label} href={href} className="font-headline text-[11px] text-[#A1A1AA] hover:text-white transition-colors duration-200">
                    {label}
                  </a>
                ))}
              </nav>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-headline text-[10px] text-[#A1A1AA]/80">
            Built on the architectural void. Powered by precision.
          </p>
          <div className="flex gap-6">
            <a href="https://x.com/RialoHQ" target="_blank" rel="noopener noreferrer" className="font-headline text-[10px] text-[#A1A1AA]/80 hover:text-white transition-colors">
              X
            </a>
            <a href="https://discord.com/invite/RialoProtocol" target="_blank" rel="noopener noreferrer" className="font-headline text-[10px] text-[#A1A1AA]/80 hover:text-white transition-colors">
              Discord
            </a>
            <a href="#" className="font-headline text-[10px] text-[#A1A1AA]/80 hover:text-white transition-colors">
              Telegram
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
