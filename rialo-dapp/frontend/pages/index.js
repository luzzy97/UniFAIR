import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRouter } from 'next/router';

export default function Home() {
  const { connect, isConnected } = useWallet();
  const router = useRouter();

  return (
    <div className="bg-black font-body text-on-surface antialiased">
      <Navbar />
      <main>
        {/* Hero Section */}
        <section className="relative overflow-hidden pt-20 pb-32 bg-black">
          <div className="max-w-[1200px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10 text-white">
              <h1 className="font-headline text-[3.5rem] leading-[1.1] font-extrabold tracking-tight mb-6 mt-10">
                Simplifying <br />DeFi Complexity <br />with AI
              </h1>
              <p className="text-white/80 max-w-lg mb-10 leading-relaxed text-lg">
                Swap, bridge, and stake seamlessly powered by intelligent agents that optimize every move, automate execution, and simplify your entire DeFi experience.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push('/staking')}
                  className="bg-white text-black px-8 py-4 rounded-full font-bold hover:bg-white/90 transition-all flex items-center gap-2"
                >
                  Get Started <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  onClick={() => router.push('/learn')}
                  className="border-2 border-white/20 text-white px-8 py-4 rounded-full font-bold hover:bg-white/10 transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative flex items-center justify-center pt-10">
              <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl"></div>
              <div className="relative w-full aspect-square max-w-[500px] bg-[#e6e2d1] rounded-[3rem] shadow-2xl p-6 flex items-center justify-center overflow-hidden border-8 border-white/10 group hover:scale-[1.02] transition-transform duration-500">
                <video 
                  src="/hero-animation.mp4" 
                  autoPlay 
                  loop 
                  muted 
                  playsInline
                  className="w-full h-full object-contain mix-blend-multiply opacity-90 scale-110"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Section */}
        <section className="bg-surface-container-low py-24">
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="mb-16">
              <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface/50 mb-2 block">Foundational Core</span>
              <h2 className="font-headline text-[2rem] font-bold">Engineered for Excellence</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: 'account_tree', title: 'Scalable Infrastructure', desc: 'Dynamic shard allocation supporting up to 100k TPS with zero latency.' },
                { icon: 'shield_lock', title: 'Secure Transactions', desc: 'Military-grade encryption protocols with multi-sig security as default.' },
                { icon: 'database', title: 'AI Data Integration', desc: 'Native support for LLM and ML data pipelines directly on-chain.' },
                { icon: 'speed', title: 'Real-Time Processing', desc: 'Sub-second finality for high-frequency financial applications.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-surface-container-lowest p-8 rounded-xl transition-all duration-300 hover:shadow-lg group">
                  <div className="w-12 h-12 rounded-lg bg-surface-container-low flex items-center justify-center mb-6 group-hover:bg-primary group-hover:text-on-primary transition-colors">
                    <span className="material-symbols-outlined">{icon}</span>
                  </div>
                  <h3 className="font-headline text-lg font-bold mb-3">{title}</h3>
                  <p className="text-on-surface/60 leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Large Cards Section */}
        <section className="py-24">
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-black text-white p-12 rounded-2xl flex flex-col justify-between min-h-[400px] border border-white/5 shadow-2xl transition-transform hover:scale-[1.02]">
                <div>
                  <h3 className="font-headline text-2xl font-bold mb-4">High Performance</h3>
                  <p className="opacity-70">Built on a custom Rust-based engine, Rialo outperforms traditional EVM chains by a factor of 10x while maintaining complete compatibility.</p>
                </div>
                <div className="text-6xl font-extrabold opacity-5 font-headline">99.9%</div>
              </div>
              <div className="lg:col-span-2 bg-surface-container p-12 rounded-xl flex flex-col justify-between border border-outline-variant/10 min-h-[400px]">
                <div className="max-w-md">
                  <h3 className="font-headline text-2xl font-bold mb-4 text-primary">Decentralized Network</h3>
                  <p className="text-on-surface/70 mb-8">Join thousands of validator nodes worldwide. Our unique consensus algorithm ensures that no single entity holds governing power over the architectural flow.</p>
                  <button className="text-primary font-bold flex items-center gap-2 group">
                    View Network Map <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </div>
                <div className="w-full h-32 bg-surface-container-highest rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  </div>
                  <div className="flex items-center gap-4 p-6 absolute bottom-0 left-0">
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest rounded-full text-xs font-bold">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      4,821 ACTIVE NODES
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 bg-surface-bright border border-outline-variant/20 p-12 rounded-xl flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex-1">
                  <h3 className="font-headline text-3xl font-bold mb-4">Secure &amp; Reliable</h3>
                  <p className="text-on-surface/70 text-lg">Every transaction is validated by the Rialo Sentinel protocol, providing an impenetrable shield against malicious actors and front-running bots.</p>
                </div>
                <div className="flex gap-4">
                  <div className="p-6 bg-surface-container-low rounded-xl text-center min-w-[140px]">
                    <span className="block font-headline text-3xl font-extrabold">0%</span>
                    <span className="text-xs uppercase font-label text-on-surface/40">Downtime</span>
                  </div>
                  <div className="p-6 bg-surface-container-low rounded-xl text-center min-w-[140px]">
                    <span className="block font-headline text-3xl font-extrabold">100+</span>
                    <span className="text-xs uppercase font-label text-on-surface/40">Audits</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-surface-container-low py-32">
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="bg-surface-container-lowest rounded-xl p-12 md:p-20 shadow-[0px_24px_48px_rgba(0,0,0,0.04)] relative overflow-hidden">
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-12">
                {[['10K+', 'Users'], ['95%', 'Efficiency'], ['50+', 'Partners'], ['24/7', 'Network']].map(([val, label]) => (
                  <div key={label} className="text-center">
                    <h4 className="font-headline text-4xl font-extrabold mb-2">{val}</h4>
                    <p className="font-label text-xs uppercase tracking-widest text-on-surface/50">{label}</p>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-surface-container-low rounded-full -mr-32 -mt-32 opacity-50"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-surface-container-low rounded-full -ml-24 -mb-24 opacity-50"></div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-surface">
          <div className="max-w-[800px] mx-auto px-8 text-center">
            <h2 className="font-headline text-[3rem] font-extrabold mb-8 tracking-tighter">Enter the Architectural Void.</h2>
            <p className="text-lg text-on-surface/60 mb-12">Ready to deploy on the most resilient infrastructure in the ecosystem? Join the Rialo developer network today.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={isConnected ? () => router.push('/staking') : connect}
                className="bg-black text-white px-12 py-5 rounded-2xl font-bold hover:bg-black/90 transition-all shadow-2xl active:scale-95"
              >
                Build on Rialo
              </button>
              <button className="bg-surface-container-low text-primary px-12 py-5 rounded-xl font-bold border border-outline-variant/10 hover:bg-surface-container-high transition-all">
                Join Community
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
