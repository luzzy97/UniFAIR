import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const articles = [
  {
    category: 'Foundations',
    title: 'What is Rialo?',
    desc: 'An in-depth technical analysis of our unique consensus mechanism and the architectural philosophy of the Void.',
    cta: 'Begin Exploration',
    span: 'md:col-span-8',
    imgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMsCt6_s7u6hzeC9Hxw7MFj_lIsVfVYasK6ntTO90wqSsUKOC1rLtMcuoV1lHtzkg1vZaxEh7PkBxYea7irVSu3zdE5BITZ0eRFTuZ4xReV-vdvtC5kwq5vEEYLqqTJk8ccEvPRdA8pzCTmz4qKJ74Kja5v3eVRpf3UqfS0dz-ZAYb8aYSor6Od9Z-4Dh9XLlJgRmPzMuyZBbbuPy1zKbN1BuSMS-Fbrvnn2FqvArZ3uYHFw71TPfMcU70XtDNn0Xc7jSUSXPUi3y4',
  },
];

const guides = [
  { num: '01', label: 'Wallet Selection' },
  { num: '02', label: 'Faucet Guide' },
  { num: '03', label: 'Network RPC' },
];

const topics = [
  { icon: 'water_drop', title: 'Staking 101', desc: 'Learn how to select pools, manage risk, and maximise your staking yield on the Rialo network.', tag: 'Beginner' },
  { icon: 'swap_horiz', title: 'Trading & Swaps', desc: 'Understand price impact, liquidity pools, and how to execute precise trades.', tag: 'Intermediate' },
  { icon: 'hub', title: 'Bridge Deep Dive', desc: 'The technical mechanics behind cross-chain settlement and asset security.', tag: 'Advanced' },
  { icon: 'code', title: 'Developer SDK', desc: 'Integrate Rialo into your application with our open-source SDK and API documentation.', tag: 'Developer' },
];

export default function LearnPage() {
  return (
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary min-h-screen">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-8 py-24">
        {/* Hero */}
        <header className="mb-24 max-w-3xl">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-surface-container-high text-primary mb-6 border border-outline-variant/20 shadow-sm">
            <span className="material-symbols-outlined text-sm mr-2">school</span>
            <span className="font-label text-xs font-bold tracking-widest uppercase">Knowledge Base</span>
          </div>
          <h1 className="font-headline text-6xl font-extrabold tracking-tight mb-8 leading-[1.1] text-black">
            The Architectural Void of Knowledge.
          </h1>
          <p className="font-body text-xl text-on-surface/60 leading-relaxed">
            Master the nuances of the Rialo ecosystem. From initial setup to high-yield staking strategies, explore the technical foundations of our Layer 1.
          </p>
        </header>

        {/* Featured Bento */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-32">
          <div className="md:col-span-8 group relative overflow-hidden rounded-2xl bg-surface-container-lowest border border-outline-variant/10 shadow-lg transition-transform duration-500 hover:scale-[1.01]">
            <div className="p-10 h-full flex flex-col">
              <div className="mb-10 aspect-[16/7] bg-[#e6e2d1] rounded-xl overflow-hidden shadow-inner relative group flex items-center justify-center">
                <video
                  src="/hero-animation.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain mix-blend-multiply opacity-90 scale-110"
                />
              </div>
              <div className="mt-auto">
                <span className="font-label text-xs font-bold tracking-[0.2em] uppercase text-primary mb-3 block">Foundations</span>
                <h2 className="font-headline text-3xl font-bold mb-4 text-black">What is Rialo?</h2>
                <p className="font-body text-on-surface/70 mb-8 max-w-xl leading-relaxed">An in-depth technical analysis of our unique consensus mechanism and the architectural philosophy of the Void.</p>
                <a href="#" className="inline-flex items-center font-label text-sm font-bold uppercase tracking-wider group/link text-primary hover:text-black transition-colors">
                  Begin Exploration
                  <span className="material-symbols-outlined ml-2 transition-transform group-hover/link:translate-x-1">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-black text-white rounded-2xl p-10 flex flex-col justify-between shadow-xl transition-transform duration-500 hover:scale-[1.01]">
            <div>
              <span className="material-symbols-outlined text-4xl mb-8 block opacity-90">speed</span>
              <h2 className="font-headline text-2xl font-bold mb-4">Getting Started</h2>
              <p className="font-body text-white/70 text-sm leading-relaxed mb-8">Set up your first wallet, secure your keys, and bridge your first assets to Rialo in under five minutes.</p>
            </div>
            <ul className="space-y-4">
              {guides.map(({ num, label }) => (
                <li key={num} className="flex items-center text-sm font-medium border-t border-white/10 pt-4 hover:pl-2 transition-all cursor-pointer group">
                  <span className="text-white/40 mr-4 font-headline group-hover:text-white transition-colors">{num}</span> 
                  <span className="group-hover:text-primary transition-colors">{label}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Topic Grid */}
        <section className="mb-32">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface/50 mb-2 block">Learn By Topic</span>
              <h2 className="font-headline text-3xl font-bold text-black">Explore the Ecosystem</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topics.map(({ icon, title, desc, tag }) => (
              <div key={title} className="bg-surface-container-lowest p-8 rounded-2xl border border-outline-variant/10 shadow-sm group cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-white transition-colors">
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-3 block">{tag}</span>
                <h3 className="font-headline text-lg font-bold mb-3 text-black">{title}</h3>
                <p className="text-on-surface/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contributors Section */}
        <section className="p-12 md:p-24 text-center mb-32 bg-surface-container-low rounded-[3rem] shadow-inner">
          <h2 className="font-headline text-[3.5rem] font-extrabold mb-6 tracking-tight text-black">Contributors</h2>
          <p className="max-w-[800px] mx-auto text-on-surface/60 mb-20 text-lg leading-relaxed font-body">
            A team of experienced builders and researchers from leading blockchain and high-growth companies, working together to build next-generation decentralized networks.
          </p>
          <div className="mt-20 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-x-12 gap-y-16 items-center w-full max-w-[1000px] mx-auto">
            {[
              "download.png", "download (7).png", "download (8).png", "download (9).png", "download (10).png", "download (11).png",
              "download (12).png", "download (13).png", "download (14).png", "download (15).png", "download (16).png", "download (17).png",
              "download (18).png", "download (19).png", "download.jpeg", "download (20).png", "download (21).png", "download (22).png",
              "download (23).png", "download (24).png", "download (25).png", "images.png", "download (26).png", "download (27).png"
            ].map((filename, i) => (
              <div key={i} className="flex items-center justify-center transition-all duration-300 hover:scale-110 cursor-default px-2">
                <img 
                  src={`/contributors/${filename}`} 
                  alt="Contributor Logo" 
                  className="max-h-[32px] w-auto h-auto object-contain mix-blend-multiply opacity-50 hover:opacity-100 transition-opacity"
                />
              </div>
            ))}
          </div>
          
          <div className="mt-32 pt-16 border-t border-outline-variant/10 text-left">
            <div className="mb-10 text-center">
              <span className="font-label text-xs uppercase tracking-[0.2em] text-primary mb-2 block">Core Builders</span>
              <h3 className="font-headline text-2xl font-bold text-black">Architects of the Void</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-[1200px] mx-auto">
              {[
                { name: 'Hakii', handle: '@frhakii', role: 'Builder', initials: 'HK', color: 'bg-black text-white hover:bg-black/80', image: '/hakii.png', link: 'https://x.com/frhakii' },
                { name: 'Luzzy', handle: '@luzzyzz97', role: 'Builder', initials: 'LZ', color: 'bg-black text-white hover:bg-black/80', image: '/luzzy.jpg', link: 'https://x.com/luzzyzz97' },
                { name: 'GOAT', handle: '@Mantle57222', role: 'Builder', initials: 'GT', color: 'bg-black text-white hover:bg-black/80', image: '/goat.png', link: 'https://x.com/Mantle57222' }
              ].map((dev) => (
                <a 
                  key={dev.handle} 
                  href={dev.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-surface-container-lowest border border-outline-variant/10 p-6 rounded-2xl flex items-center gap-5 transition-all hover:border-outline-variant/30 hover:shadow-lg group"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-headline font-bold text-lg overflow-hidden transition-colors ${dev.color}`}>
                    {dev.image ? (
                      <img src={dev.image} alt={dev.name} className="w-full h-full object-cover" />
                    ) : (
                      dev.initials
                    )}
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-black group-hover:text-primary transition-colors">{dev.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-label text-[10px] uppercase tracking-widest text-on-surface/40 font-bold">{dev.role}</span>
                      <span className="w-1 h-1 rounded-full bg-outline-variant/30"></span>
                      <span className="font-body text-sm text-on-surface/60">{dev.handle}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="bg-black text-white rounded-3xl p-12 md:p-24 text-center shadow-2xl">
          <h2 className="font-headline text-4xl font-extrabold mb-6 tracking-tight">Stay at the Frontier.</h2>
          <p className="text-white/60 max-w-lg mx-auto mb-10 text-lg leading-relaxed">Get weekly protocol updates, ecosystem reports, and deep-dive technical articles delivered directly to your inbox.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-white/10 border border-white/20 rounded-xl px-6 py-4 focus:ring-2 focus:ring-white/50 focus:border-transparent font-body placeholder:text-white/40 text-white outline-none transition-all shadow-inner"
            />
            <button className="bg-white text-black px-10 py-4 rounded-xl font-headline font-bold hover:bg-white/90 transition-all shadow-lg active:scale-95 text-lg">
              Subscribe
            </button>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
