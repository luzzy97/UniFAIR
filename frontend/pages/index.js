import Spline from '@splinetool/react-spline';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useWallet } from '../hooks/useWallet';
import { useRouter } from 'next/router';

export default function Home() {
  const { connect, isConnected } = useWallet();
  const router = useRouter();

  return (
    <div className="bg-[#0c0c0c] font-body text-zinc-900 antialiased">
      <Navbar />
      <main>
        {/* Hero Section Updated to Dark */}
        <section className="relative overflow-hidden pt-20 pb-32 bg-[#0c0c0c]">
          <div className="max-w-[1200px] mx-auto px-8 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="z-10 text-white">
              <h1 className="text-[3.5rem] md:text-[4.5rem] leading-[1.05] mb-6 mt-10 text-white font-extrabold tracking-tight">
                Unified DeFi Ecosystem.
              </h1>
              <p className="text-white/50 max-w-lg mb-10 leading-relaxed text-lg font-medium">
                Access native swapping, bridging, and staking from one intuitive command center. We eliminate Web3 fragmentation by delivering a streamlined, zero-friction interface designed specifically for Rialo.
              </p>
                <div className="flex flex-wrap gap-5">
                  <button
                    onClick={() => router.push('/swap')}
                    className="bg-white text-black px-10 py-5 rounded-2xl font-extrabold hover:bg-white/90 transition-all flex items-center gap-3 shadow-2xl active:scale-95"
                  >
                    Get Started <span className="material-symbols-outlined text-sm">arrow_forward</span>
                  </button>
                  <button
                    onClick={() => router.push('/learn')}
                    className="border border-white/20 text-white px-10 py-5 rounded-2xl font-extrabold hover:bg-white/5 transition-all"
                  >
                    Learn More
                  </button>
                </div>
            </div>
            <div className="relative flex items-center justify-center pt-10">
              <div className="absolute inset-0 bg-primary/10 rounded-full blur-[100px]"></div>
              <div className="relative w-full aspect-square max-w-[550px] flex items-center justify-center">
                <Spline
                  scene="https://prod.spline.design/lHIxJz2iiYiDzZRX/scene.splinecode" 
                  className="w-full h-full transform scale-[1.15] relative z-10"
                />
                
                {/* Watermark Cover */}
                <div className="absolute bottom-4 right-4 w-[160px] h-[50px] bg-[#0c0c0c] z-20 pointer-events-none rounded-xl blur-[2px]"></div>
                <div className="absolute bottom-2 right-2 w-[170px] h-[60px] bg-[#0c0c0c] z-20 pointer-events-none rounded-lg"></div>
              </div>
            </div>
          </div>
        </section>

        {/* Feature Bento Section */}
        <section className="bg-zinc-50 py-24">
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="mb-16">
              <span className="font-label text-xs uppercase tracking-[0.2em] text-zinc-400 mb-2 block">UNIFIED INTERFACE</span>
              <h2 className="font-headline text-[2.5rem] font-extrabold text-black leading-tight tracking-tight">Engineered for a Zero-Friction Experience</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: 'swap_horiz', title: 'Frictionless Swapping', desc: 'Experience a fluid and intuitive trading interface. We removed the visual clutter, allowing you to execute swaps seamlessly within a single, unified environment.' },
                { icon: 'hub', title: 'Seamless Asset Bridging', desc: 'Visualize cross-network transfers through a simplified dashboard. Our design aims to eliminate the complex steps usually associated with third-party bridges' },
                { icon: 'database', title: 'Unified Staking Hub', desc: 'Monitor and manage your entire portfolio from one intuitive command center. Say goodbye to fragmented Web3 experiences and confusing protocol navigation.' },
                { icon: 'speed', title: 'Frictionless User Journey', desc: 'Interact with advanced DeFi concepts confidently. The interface is purposefully designed with a clean, modern aesthetic to make complex financial activities accessible to everyone.' },
              ].map(({ icon, title, desc }) => (
                <div key={title} className="bg-[#0c0c0c] text-white p-10 rounded-3xl transition-all duration-300 hover:-translate-y-2 border border-white/5 shadow-[0_20px_50px_rgba(0,0,0,0.1)] group">
                  <div className="w-12 h-12 rounded-xl bg-[#161616] border border-white/10 flex items-center justify-center mb-8 group-hover:bg-white group-hover:text-black transition-all duration-300">
                    <span className="material-symbols-outlined text-white/70 group-hover:text-black transition-colors">{icon}</span>
                  </div>
                  <h3 className="font-headline text-xl font-extrabold mb-4 tracking-tight">{title}</h3>
                  <p className="text-white/40 leading-relaxed text-sm font-medium">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Large Cards Section */}
        <section className="bg-white py-24">
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 bg-black text-white p-12 rounded-3xl flex flex-col justify-between min-h-[400px] border border-white/5 shadow-2xl transition-all hover:-translate-y-1">
                <div>
                  <h3 className="font-headline text-2xl font-extrabold mb-6 tracking-tight">Intuitive Experience</h3>
                  <p className="opacity-50 font-medium leading-relaxed">Designed to minimize cognitive load. By combining swapping, bridging, and staking into a single interface, we eliminate the need to switch between multiple tabs or fragmented dApps.</p>
                </div>
                <div className="text-7xl font-extrabold opacity-5 font-headline tracking-tighter">100%</div>
              </div>
              <div className="lg:col-span-2 bg-[#0c0c0c] p-12 rounded-3xl flex flex-col justify-between border border-white/5 min-h-[400px] shadow-2xl text-white">
                <div className="max-w-md">
                  <h3 className="font-headline text-2xl font-extrabold mb-6 tracking-tight text-white">Centralized Portfolio View</h3>
                  <p className="text-white/40 mb-10 font-medium leading-relaxed">A comprehensive overview of your assets. The dashboard is designed to provide clear, real-time visualization of your balances and staking positions across the entire Rialo ecosystem</p>
                  <button onClick={() => router.push('/dashboard')} className="text-white font-extrabold flex items-center gap-3 group border border-white/10 px-8 py-3 rounded-2xl w-fit hover:bg-white/10 transition-all shadow-xl">
                    Explore Dashboard <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
                  </button>
                </div>
                <div className="w-full h-32 bg-white/5 rounded-lg overflow-hidden relative">
                  <div className="absolute inset-0 opacity-10">
                    <div className="w-full h-full bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:20px_20px]"></div>
                  </div>
                  <div className="flex items-center gap-4 p-6 absolute bottom-0 left-0">
                    <div className="flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-xs font-bold text-white/50 border border-white/10">
                      <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                      REAL-TIME TRACKING
                    </div>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-3 bg-zinc-50 border border-zinc-100 p-12 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-12">
                <div className="flex-1">
                  <h3 className="font-headline text-3xl font-bold mb-4 text-black">Designed for Confidence</h3>
                  <p className="text-zinc-500 text-lg">Clean design isn't just about aesthetics; it's about clarity. By providing transparent transaction previews and a frictionless flow, the interface helps prevent costly user errors.</p>
                </div>
                <div className="flex gap-4">
                  <div className="p-6 bg-[#0c0c0c] rounded-xl text-center min-w-[140px] border border-white/5 shadow-xl">
                    <span className="block font-headline text-3xl font-extrabold text-white">0</span>
                    <span className="text-xs uppercase font-label text-white/30">COMPLEXITY</span>
                  </div>
                  <div className="p-6 bg-[#0c0c0c] rounded-xl text-center min-w-[140px] border border-white/5 shadow-xl">
                    <span className="block font-headline text-3xl font-extrabold text-white">1</span>
                    <span className="text-xs uppercase font-label text-white/30">UNIFIED HUB</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="bg-zinc-50 py-32">
          <div className="max-w-[1200px] mx-auto px-8">
            <div className="bg-[#0c0c0c] rounded-3xl p-12 md:p-20 shadow-2xl relative overflow-hidden border border-white/5">
              <div className="relative z-10 grid grid-cols-2 md:grid-cols-4 gap-12">
                {[['10K+', 'Users'], ['95%', 'Efficiency'], ['50+', 'Partners'], ['24/7', 'Network']].map(([val, label]) => (
                  <div key={label} className="text-center">
                    <h4 className="font-headline text-4xl font-extrabold mb-2 text-white">{val}</h4>
                    <p className="font-label text-xs uppercase tracking-widest text-white/30">{label}</p>
                  </div>
                ))}
              </div>
              <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -mr-32 -mt-32 opacity-50 blur-3xl"></div>
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/5 rounded-full -ml-24 -mb-24 opacity-50 blur-3xl"></div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-32 bg-white">
          <div className="max-w-[800px] mx-auto px-8 text-center">
            <h2 className="font-headline text-[3rem] font-extrabold mb-8 tracking-tighter text-black">Enter the Architectural Void.</h2>
            <p className="text-lg text-zinc-500 mb-12 font-medium">Ready to deploy on the most resilient infrastructure in the ecosystem? Join the Rialo developer network today.</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4">
              <button
                onClick={isConnected ? () => router.push('/dashboard') : connect}
                className="bg-black text-white px-12 py-5 rounded-2xl font-bold hover:bg-black/90 transition-all shadow-2xl active:scale-95"
              >
                {isConnected ? 'Launch Dashboard' : 'Connect Wallet'}
              </button>
              <a 
                href="https://discord.com/invite/RialoProtocol"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-zinc-50 text-zinc-600 px-12 py-5 rounded-2xl font-bold border border-zinc-200 hover:bg-zinc-100 transition-all flex items-center justify-center"
              >
                Join Community
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
