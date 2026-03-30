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
        {/* Hero Section Updated */}
        <section className="relative overflow-hidden pt-20 pb-32 bg-black">
          <div className="max-w-[1200px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10 text-white">
              <h1 className="font-headline text-[3.5rem] leading-[1.1] font-extrabold tracking-tight mb-6 mt-10">
                Unified DeFi Ecosystem
              </h1>
              <p className="text-white/80 max-w-lg mb-10 leading-relaxed text-lg">
                Access native swapping, bridging, and staking from one intuitive command center. We eliminate Web3 fragmentation by delivering a streamlined, zero-friction interface designed specifically for Rialo.
              </p>
              <div className="flex flex-wrap gap-4">
                <button
                  onClick={() => router.push('/swap')}
                  className="bg-emerald-500 text-on-primary px-8 py-4 rounded-full font-bold hover:bg-emerald-400 transition-all flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  Get Started <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
                <button
                  onClick={() => router.push('/learn')}
                  className="border-2 border-emerald-500/20 text-emerald-500 px-8 py-4 rounded-full font-bold hover:bg-emerald-500/10 transition-all"
                >
                  Learn More
                </button>
              </div>
            </div>
            <div className="relative flex items-center justify-center pt-10">
              <div className="absolute inset-0 bg-white/5 rounded-full blur-3xl"></div>
              <div className="relative w-full aspect-square max-w-[500px] bg-[#121212] rounded-[3rem] shadow-2xl p-6 flex items-center justify-center overflow-hidden border-8 border-white/5 group hover:scale-[1.02] transition-transform duration-500">
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
              <span className="font-label text-xs uppercase tracking-[0.2em] text-on-surface/50 mb-2 block">UNIFIED INTERFACE</span>
              <h2 className="font-headline text-[2rem] font-bold">Engineered for a Zero-Friction Experience</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: 'swap_horiz', title: 'Frictionless Swapping', desc: 'Experience a fluid and intuitive trading interface. We removed the visual clutter, allowing you to execute swaps seamlessly within a single, unified environment.' },
                { icon: 'hub', title: 'Seamless Asset Bridging', desc: 'Visualize cross-network transfers through a simplified dashboard. Our design aims to eliminate the complex steps usually associated with third-party bridges' },
                { icon: 'database', title: 'Unified Staking Hub', desc: 'Monitor and manage your entire portfolio from one intuitive command center. Say goodbye to fragmented Web3 experiences and confusing protocol navigation.' },
                { icon: 'speed', title: 'Frictionless User Journey', desc: 'Interact with advanced DeFi concepts confidently. The interface is purposefully designed with a clean, modern aesthetic to make complex financial activities accessible to everyone.' },
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
                  <h3 className="font-headline text-2xl font-bold mb-4">Intuitive Experience</h3>
                  <p className="opacity-70">Designed to minimize cognitive load. By combining swapping, bridging, and staking into a single interface, we eliminate the need to switch between multiple tabs or fragmented dApps.</p>
                </div>
                <div className="text-6xl font-extrabold opacity-5 font-headline">100%</div>
              </div>
              <div className="lg:col-span-2 bg-surface-container p-12 rounded-xl flex flex-col justify-between border border-outline-variant/10 min-h-[400px]">
                <div className="max-w-md">
                  <h3 className="font-headline text-2xl font-bold mb-4 text-primary">Centralized Portfolio View</h3>
                  <p className="text-on-surface/70 mb-8">A comprehensive overview of your assets. The dashboard is designed to provide clear, real-time visualization of your balances and staking positions across the entire Rialo ecosystem</p>
                  <button onClick={() => router.push('/dashboard')} className="text-primary font-bold flex items-center gap-2 group">
                    Explore the Dashboard <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </div>
                <div className="w-full h-32 bg-surface-container-highest rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 opacity-20">
                    <div className="w-full h-full bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  </div>
                  <div className="flex items-center gap-4 p-6 absolute bottom-0 left-0">
                    <div className="flex items-center gap-2 px-3 py-1 bg-surface-container-lowest rounded-full text-xs font-bold">
                      <div className="w-2 h-2 rounded-full bg-primary animate-pulse"></div>
                      REAL-TIME TRACKING
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 bg-surface-bright border border-outline-variant/20 p-12 rounded-xl flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex-1">
                  <h3 className="font-headline text-3xl font-bold mb-4">Designed for Confidence</h3>
                  <p className="text-on-surface/70 text-lg">Clean design isn't just about aesthetics; it's about clarity. By providing transparent transaction previews and a frictionless flow, the interface helps prevent costly user errors.</p>
                </div>
                <div className="flex gap-4">
                  <div className="p-6 bg-surface-container-low rounded-xl text-center min-w-[140px]">
                    <span className="block font-headline text-3xl font-extrabold">0</span>
                    <span className="text-xs uppercase font-label text-on-surface/40">COMPLEXITY</span>
                  </div>
                  <div className="p-6 bg-surface-container-low rounded-xl text-center min-w-[140px]">
                    <span className="block font-headline text-3xl font-extrabold">1</span>
                    <span className="text-xs uppercase font-label text-on-surface/40">UNIFIED HUB</span>
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
                onClick={isConnected ? () => router.push('/dashboard') : connect}
                className="bg-emerald-500 text-on-primary px-12 py-5 rounded-2xl font-bold hover:bg-emerald-400 transition-all shadow-[0_0_30px_rgba(16,185,129,0.2)] active:scale-95"
              >
                {isConnected ? 'Launch Dashboard' : 'Connect Wallet'}
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
