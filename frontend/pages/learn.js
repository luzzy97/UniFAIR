import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

const articles = [
  {
    category: 'Introduction to UniFAIR',
    title: 'What is UniFAIR?',
    desc: 'Dive into how UniFAIR acts as the ultimate frontend layer for the Rialo network. Learn about our AI Agent integration, ServicePaymaster routing, and RWA accumulation.',
    cta: 'READ THE DOCS',
    span: 'md:col-span-8',
    imgUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDMsCt6_s7u6hzeC9Hxw7MFj_lIsVfVYasK6ntTO90wqSsUKOC1rLtMcuoV1lHtzkg1vZaxEh7PkBxYea7irVSu3zdE5BITZ0eRFTuZ4xReV-vdvtC5kwq5vEEYLqqTJk8ccEvPRdA8pzCTmz4qKJ74Kja5v3eVRpf3UqfS0dz-ZAYb8aYSor6Od9Z-4Dh9XLlJgRmPzMuyZBbbuPy1zKbN1BuSMS-Fbrvnn2FqvArZ3uYHFw71TPfMcU70XtDNn0Xc7jSUSXPUi3y4',
  },
];



const topics = [
  { icon: 'water_drop', title: 'Zero-Gas Stake', desc: 'Learn how to maximize your RLO yield and generate Service Credits to completely eliminate gas fees.', tag: 'Beginner' },
  { icon: 'swap_horiz', title: 'The RWA Hub', desc: 'Understand how to automatically diversify your crypto yield directly into stable assets like US Treasuries and Gold.', tag: 'Intermediate' },
  { icon: 'hub', title: 'The AI Agent', desc: 'Discover how our AI Agent works 24/7 to auto-compound your yield and execute smart swaps using your Credits.', tag: 'Advanced' },
  { icon: 'code', title: 'Developer SDK', desc: "Integrate the ServicePaymaster and Rialo's routing logic into your own dApp with our open-source tools.", tag: 'Developer' },
];

export default function LearnPage() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [message, setMessage] = useState('');
  const [videoSrc, setVideoSrc] = useState("/Animasi/img.16/learn-animation.mp4");

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      setStatus('error');
      setMessage('Please enter a valid email.');
      return;
    }

    setStatus('loading');
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
      const res = await fetch(`${baseUrl}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      
      if (data.success) {
        setStatus('success');
        setMessage(data.message || 'Thank you for subscribing!');
        setEmail('');
      } else {
        throw new Error(data.error || 'Something went wrong.');
      }
    } catch (err) {
      setStatus('error');
      setMessage(err.message);
    }
  };

  return (
    <div className="bg-white font-body text-zinc-900 antialiased selection:bg-black selection:text-white min-h-screen">
      <Navbar />
      <main className="max-w-[1200px] mx-auto px-8 py-24">
        {/* Hero */}
        <header className="mb-24 max-w-3xl">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-zinc-50 text-black mb-6 border border-zinc-200 shadow-sm">
            <span className="material-symbols-outlined text-sm mr-2">school</span>
            <span className="font-label text-xs font-bold tracking-widest uppercase">Knowledge Base</span>
          </div>
          <h1 className="text-6xl text-black mb-8">
            UniFAIR Intelligence Hub.
          </h1>
          <p className="font-body text-xl text-zinc-500 leading-relaxed font-medium">
            Discover how UniFAIR simplifies Web3. From zero-gas SfS mechanics to AI-driven automation, explore the architecture behind intelligent DeFi.
          </p>
        </header>

        {/* Featured Bento */}
        <section className="flex justify-center mb-32">
          <div className="w-full md:w-[75%] group relative overflow-hidden rounded-2xl bg-[#0c0c0c] border border-white/5 shadow-2xl transition-transform duration-500 hover:scale-[1.01]">
            <div className="p-6 h-full flex flex-col">
              <div className="mb-6 h-72 bg-[#e6e2d1] rounded-xl overflow-hidden shadow-inner relative group flex items-center justify-center">
                <video
                  src={videoSrc}
                  autoPlay
                  muted
                  playsInline
                  onEnded={() => {
                    if (videoSrc.includes("img.16")) {
                      setVideoSrc("/Animasi/img.17/learn-animation.mp4");
                    }
                  }}
                  loop={videoSrc.includes("img.17")}
                  className="w-full h-full object-contain mix-blend-multiply opacity-90 scale-110"
                />
              </div>
              <div className="mt-auto">
                <span className="font-label text-xs font-bold tracking-[0.2em] uppercase text-white/40 mb-2 block">Introduction to UniFAIR</span>
                <h2 className="font-headline text-2xl font-bold mb-3 text-white">What is UniFAIR?</h2>
                <p className="font-body text-white/50 mb-6 max-w-xl leading-relaxed text-sm">Dive into how UniFAIR acts as the ultimate frontend layer for the Rialo network. Learn about our AI Agent integration, ServicePaymaster routing, and RWA accumulation.</p>
                <a href="https://docs-unifair.vercel.app/" target="_blank" rel="noopener noreferrer" className="inline-flex items-center font-label text-sm font-bold uppercase tracking-wider group/link text-white hover:text-white/80 transition-colors">
                  READ THE DOCS
                  <span className="material-symbols-outlined ml-2 transition-transform group-hover/link:translate-x-1">arrow_forward</span>
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Topic Grid */}
        <section className="mb-32">
          <div className="flex items-end justify-between mb-12">
            <div>
              <span className="font-label text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2 block">Learn By Topic</span>
              <h2 className="font-headline text-3xl font-bold text-black uppercase">Explore the Ecosystem</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {topics.map(({ icon, title, desc }) => (
              <div key={title} className="bg-[#0c0c0c] p-8 rounded-3xl border border-white/5 shadow-2xl group cursor-pointer hover:-translate-y-1 transition-all duration-300">
                <div className="w-12 h-12 rounded-xl bg-[#161616] border border-white/10 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-300">
                  <span className="material-symbols-outlined text-[20px] text-white/70 group-hover:text-black transition-colors">{icon}</span>
                </div>
                <h3 className="font-headline text-xl font-bold mb-4 text-white">{title}</h3>
                <p className="text-white/40 text-sm leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Contributors Section */}
        <section className="p-12 md:p-24 text-center mb-32 bg-zinc-50 rounded-[3rem] border border-zinc-100">
          <h2 className="font-headline text-[3.5rem] font-extrabold mb-6 tracking-tight text-black uppercase">Contributors</h2>
          <p className="max-w-[800px] mx-auto text-zinc-500 mb-20 text-lg leading-relaxed font-body font-medium">
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
                { name: 'HAKII', handle: '@frhakii', role: 'Builder', initials: 'HK', color: 'bg-black text-white hover:bg-black/80', image: '/hakii.png', link: 'https://x.com/frhakii' },
                { name: 'LUZZY', handle: '@luzzyzz97', role: 'Builder', initials: 'LZ', color: 'bg-black text-white hover:bg-black/80', image: '/luzzy.jpg', link: 'https://x.com/luzzyzz97' },
                { name: 'GOAT', handle: '@Mantle57222', role: 'Builder', initials: 'GT', color: 'bg-black text-white hover:bg-black/80', image: '/goat.png', link: 'https://x.com/Mantle57222' }
              ].map((dev) => (
                <a 
                  key={dev.name}
                  href={dev.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-black border border-white/10 p-6 rounded-2xl flex items-center gap-5 transition-all duration-300 hover:border-white/30 hover:shadow-2xl hover:-translate-y-1 hover:scale-[1.02] group"
                >
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center font-headline font-bold text-lg overflow-hidden transition-colors ${dev.color}`}>
                    {dev.image ? (
                      <img src={dev.image} alt={dev.name} className="w-full h-full object-cover" />
                    ) : (
                      dev.initials
                    )}
                  </div>
                  <div>
                    <h3 className="font-headline text-xl font-bold text-white group-hover:text-primary transition-colors">{dev.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-label text-[10px] uppercase tracking-widest text-white/40 font-bold">{dev.role}</span>
                      <span className="w-1 h-1 rounded-full bg-white/20"></span>
                      <span className="font-body text-sm text-white/60">{dev.handle}</span>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-black text-white rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
          <div className="relative z-10">
            <h2 className="font-headline text-2xl font-extrabold mb-3 tracking-tight">Stay at the Frontier.</h2>
            <p className="text-white/60 max-w-lg mx-auto mb-6 text-sm leading-relaxed">Get weekly protocol updates, ecosystem reports, and deep-dive technical articles delivered directly to your inbox.</p>
            
            {status === 'success' ? (
              <div className="bg-white/10 border border-white/20 rounded-2xl p-8 max-w-md mx-auto animate-in fade-in zoom-in duration-500">
                <span className="material-symbols-outlined text-4xl mb-4 text-primary">check_circle</span>
                <h3 className="font-headline text-xl font-bold mb-2">You're in.</h3>
                <p className="text-white/60 text-sm">{message}</p>
                <button 
                  onClick={() => setStatus('idle')}
                  className="mt-6 text-xs uppercase tracking-widest font-bold text-white/40 hover:text-white transition-colors"
                >
                  Register another email
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-4 max-w-md mx-auto">
                <div className="flex-1 relative">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    disabled={status === 'loading'}
                    className="w-full bg-white/10 border border-white/20 rounded-xl px-6 py-4 focus:ring-2 focus:ring-white/50 focus:border-transparent font-body placeholder:text-white/40 text-white outline-none transition-all shadow-inner disabled:opacity-50"
                  />
                  {status === 'error' && (
                    <p className="absolute -bottom-6 left-0 text-[10px] text-red-400 font-bold uppercase tracking-wider">{message}</p>
                  )}
                </div>
                <button 
                  type="submit"
                  disabled={status === 'loading'}
                  className="bg-white text-black px-10 py-4 rounded-xl font-headline font-bold hover:bg-white/90 transition-all shadow-lg active:scale-95 text-lg disabled:opacity-50 disabled:scale-100 min-w-[160px]"
                >
                  {status === 'loading' ? 'Joining...' : 'Subscribe'}
                </button>
              </form>
            )}
          </div>
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -mr-48 -mt-48 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
