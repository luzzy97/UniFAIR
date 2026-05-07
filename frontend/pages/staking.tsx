import React, { useState } from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

// Import 2 Laci Utama (Reward Dihapus)
import StakeTab from '../components/StakeTab';
import RwaHubTab from '../components/RwaHubTab';

export default function StakingPage() {
  const [activeView, setActiveView] = useState('stake');

  return (
    <div className="min-h-screen font-body antialiased flex flex-col transition-colors duration-500" style={{ backgroundColor: '#f8f9fa', color: '#1a1a1a' }}>
      <Head>
        <title>Stake | UniFAIR</title>
      </Head>

      <Navbar />

      <main className="min-h-[calc(100vh-250px)] flex flex-col items-center pt-20 px-4 pb-24">

        {/* Header Teks Mewah */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-black tracking-tighter" style={{ fontSize: '3.5rem' }}>Stake</h1>
          <p className="font-bold text-gray-500 mb-6">Maximize your yield and access Real World Assets</p>
        </div>

        {/* Navigasi Tab (Pill Style ala UniHub) */}
        <div className="flex justify-center mb-6">
          <div className="flex gap-1 p-1 rounded-full border border-black/10 shadow-xl" style={{ backgroundColor: '#010101' }}>
            <button
              onClick={() => setActiveView('stake')}
              className={`font-black text-[10px] uppercase tracking-widest transition-all px-8 py-3 rounded-full ${activeView === 'stake'
                ? 'bg-white text-black shadow-md'
                : 'text-white/40 hover:text-white'
                }`}
            >
              Stake RLO
            </button>
            <button
              onClick={() => setActiveView('rwa')}
              className={`font-black text-[10px] uppercase tracking-widest transition-all px-8 py-3 rounded-full ${activeView === 'rwa'
                ? 'bg-white text-black shadow-md'
                : 'text-white/40 hover:text-white'
                }`}
            >
              RWA Hub
            </button>
          </div>
        </div>

        {/* Mesin Pemanggil Tab (Dibatasi lebarnya agar proporsional) */}
        <div className="w-full max-w-[720px] transition-all duration-300 ease-in-out">
          {activeView === 'stake' && <StakeTab />}
          {activeView === 'rwa' && <RwaHubTab />}
        </div>

      </main>

      <Footer />
    </div>
  );
}