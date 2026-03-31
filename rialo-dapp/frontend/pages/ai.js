import React from 'react';
import Head from 'next/head';
import Navbar from '../components/Navbar';
import AiAgent from '../components/AiAgent';

export default function AiPage() {
  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#000', color: '#fff' }}>
      <Head>
        <title>Rialo AI Assistant | Optimize DeFi</title>
      </Head>
      <Navbar />
      
      <main className="min-h-[819px] flex flex-col items-center justify-center px-6 py-20">
        <h1 className="font-headline text-5xl font-extrabold tracking-tighter text-center mb-4" style={{ 
          background: 'linear-gradient(to right, #fff, #10b981)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          fontSize: '3.5rem'
        }}>
          Rialo AI Assistant
        </h1>
        <p className="font-body text-white/80 text-lg text-center max-w-md mx-auto mb-12">
          Execute highly optimized on-chain operations using natural language. Fast, secure, and intent-driven.
        </p>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <AiAgent />
        </div>
      </main>
    </div>
  );
}
