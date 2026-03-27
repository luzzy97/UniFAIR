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
    <div className="bg-surface font-body text-on-surface antialiased selection:bg-primary selection:text-on-primary">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-8 py-24">
        {/* Hero */}
        <header className="mb-24 max-w-3xl">
          <div className="inline-flex items-center px-3 py-1 rounded-full bg-surface-container-high text-primary mb-6">
            <span className="material-symbols-outlined text-sm mr-2">school</span>
            <span className="font-label text-xs font-bold tracking-widest uppercase">Knowledge Base</span>
          </div>
          <h1 className="font-headline text-6xl font-extrabold tracking-tight mb-8 leading-[1.1]">
            The Architectural Void of Knowledge.
          </h1>
          <p className="font-body text-xl text-on-surface/60 leading-relaxed">
            Master the nuances of the Rialo ecosystem. From initial setup to high-yield staking strategies, explore the technical foundations of our Layer 1.
          </p>
        </header>

        {/* Featured Bento */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-6 mb-32">
          <div className="md:col-span-8 group relative overflow-hidden rounded-xl bg-surface-container-lowest shadow-[0px_24px_48px_rgba(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.01]">
            <div className="p-12 h-full flex flex-col">
              <div className="mb-12 aspect-[16/7] bg-[#e6e2d1] rounded-2xl overflow-hidden border-8 border-white/10 shadow-2xl relative group">
                <video
                  src="/learn-animation.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain mix-blend-multiply opacity-95 scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none"></div>
              </div>
              <div className="mt-auto">
                <span className="font-label text-[10px] font-bold tracking-[0.2em] uppercase text-primary/40 mb-3 block">Foundations</span>
                <h2 className="font-headline text-3xl font-bold mb-4">What is Rialo?</h2>
                <p className="font-body text-on-surface/60 mb-8 max-w-xl">An in-depth technical analysis of our unique consensus mechanism and the architectural philosophy of the Void.</p>
                <a href="#" className="inline-flex items-center font-label text-sm font-bold uppercase tracking-wider group/link">
                  Begin Exploration
                  <span className="material-symbols-outlined ml-2 transition-transform group-hover/link:translate-x-1">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>

          <div className="md:col-span-4 bg-primary text-on-primary rounded-xl p-10 flex flex-col justify-between shadow-[0px_24px_48px_rgba(0,0,0,0.04)] transition-all duration-500 hover:scale-[1.01]">
            <div>
              <span className="material-symbols-outlined text-4xl mb-8 block">speed</span>
              <h2 className="font-headline text-2xl font-bold mb-4">Getting Started</h2>
              <p className="font-body text-on-primary/70 text-sm leading-relaxed mb-6">Set up your first wallet, secure your keys, and bridge your first assets to Rialo in under five minutes.</p>
            </div>
            <ul className="space-y-4">
              {guides.map(({ num, label }) => (
                <li key={num} className="flex items-center text-sm font-medium border-t border-on-primary/10 pt-4">
                  <span className="text-on-primary/40 mr-4 font-headline">{num}</span> {label}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* Topic Grid */}
        <section className="mb-32">
          <div className="flex items-end justify-between mb-16">
            <div>
              <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface/50 mb-2 block">Learn By Topic</span>
              <h2 className="font-headline text-3xl font-bold">Explore the Ecosystem</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topics.map(({ icon, title, desc, tag }) => (
              <div key={title} className="bg-surface-container-lowest p-8 rounded-xl shadow-[0px_24px_48px_rgba(0,0,0,0.04)] group cursor-pointer hover:shadow-xl transition-all duration-300">
                <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                  <span className="material-symbols-outlined">{icon}</span>
                </div>
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface/40 mb-3 block">{tag}</span>
                <h3 className="font-headline text-lg font-bold mb-3">{title}</h3>
                <p className="text-on-surface/60 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contributors Section */}
        <section className="p-12 md:p-24 text-center mb-32 text-[#111111]">
          <h2 className="font-headline text-[3.5rem] font-medium mb-6 tracking-tight">Contributors</h2>
          <p className="max-w-[1000px] mx-auto text-on-surface/50 mb-20 text-lg leading-relaxed font-body">
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
                  className="max-h-[32px] w-auto h-auto object-contain mix-blend-multiply grayscale contrast-[1.2] brightness-[1.1] opacity-70 hover:opacity-100"
                />
              </div>
            ))}
          </div>

          <div className="mt-40">
            <div className="mb-10 text-center">
              <span className="font-label text-xs uppercase tracking-[0.2em] text-primary/80 mb-2 block">Core Builders</span>
              <h3 className="font-headline text-2xl font-bold text-[#111111]">Architects of the Void</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-[800px] mx-auto">
              {[
                { name: 'Hakii', handle: '@frhakii', role: 'Builder', initials: 'HK', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
                { name: 'Luzzy', handle: '@luzzyzz97', role: 'Builder', initials: 'LZ', color: 'bg-purple-500/10 text-purple-400 border-purple-500/20' }
              ].map((dev) => (
                <div key={dev.handle} className="bg-[#0c0c0c] border border-white/5 p-6 rounded-2xl flex items-center gap-5 transition-all hover:border-white/10 hover:shadow-2xl hover:shadow-primary/5 group text-left">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-headline font-bold text-lg border ${dev.color}`}>
                    {dev.initials}
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-white group-hover:text-primary transition-colors">{dev.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-label text-[10px] uppercase tracking-widest text-white/30">{dev.role}</span>
                      <span className="w-1 h-1 rounded-full bg-white/10"></span>
                      <span className="font-body text-sm text-primary/60">{dev.handle}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Newsletter CTA */}
        <section className="bg-surface-container-lowest rounded-xl p-12 md:p-20 text-center shadow-[0px_24px_48px_rgba(0,0,0,0.04)]">
          <h2 className="font-headline text-3xl font-bold mb-4">Stay at the Frontier.</h2>
          <p className="text-on-surface/60 max-w-md mx-auto mb-8">Get weekly protocol updates, ecosystem reports, and deep-dive articles delivered to your inbox.</p>
          <div className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
            <input
              type="email"
              placeholder="Enter your email"
              className="flex-1 bg-surface-container-low border border-outline-variant/20 rounded-xl px-5 py-3 focus:ring-1 focus:ring-primary focus:border-primary font-body"
            />
            <button className="bg-primary text-on-primary px-8 py-3 rounded-xl font-bold hover:bg-primary-container transition-all">
              Subscribe
            </button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
