import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-[#000000] text-white w-full pt-12 pb-8">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-1 md:col-span-2 pr-0 md:pr-12">
            <Link href="/" className="inline-block mb-4">
              <img src="/logo.svg" alt="Rialo Logo" className="h-8 w-auto opacity-90 hover:opacity-100 transition-opacity" />
            </Link>
            <p className="font-headline text-xs text-[#A1A1AA] leading-relaxed max-w-md">
              © 2025 Rialo. The architectural void of Layer 1. Engineered for scalability, precision, and the future of decentralized value exchange.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-headline font-bold text-white uppercase text-[10px] tracking-[0.2em]">Platform</h4>
            <nav className="flex flex-col gap-2">
              {[['/', 'Home'], ['/staking', 'Staking'], ['/rewards', 'Rewards'], ['/swap', 'Swap']].map(([href, label]) => (
                <Link key={href} href={href} className="font-headline text-xs text-[#A1A1AA] hover:text-white transition-all duration-200">{label}</Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-col gap-4">
            <h4 className="font-headline font-bold text-white uppercase text-[10px] tracking-[0.2em]">Resources</h4>
            <nav className="flex flex-col gap-2">
              {[['#', 'Documentation'], ['#', 'Whitepaper'], ['/learn', 'Learn'], ['#', 'GitHub']].map(([href, label]) => (
                <a key={label} href={href} className="font-headline text-xs text-[#A1A1AA] hover:text-white transition-all duration-200">{label}</a>
              ))}
            </nav>
          </div>
        </div>
        <div className="border-t border-white/5 pt-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-headline text-[10px] text-[#A1A1AA]">Built on the architectural void. Powered by precision.</p>
          <div className="flex gap-6">
            {['Twitter', 'Discord', 'Telegram'].map((s) => (
              <a key={s} href="#" className="font-headline text-[10px] text-[#A1A1AA] hover:text-white transition-all">{s}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
