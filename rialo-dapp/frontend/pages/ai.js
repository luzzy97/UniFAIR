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
      
      <main style={{ padding: '60px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h1 style={{ 
          fontSize: '32px', 
          fontWeight: '800', 
          marginBottom: '12px', 
          letterSpacing: '0.05em', 
          textAlign: 'center',
          background: 'linear-gradient(to right, #fff, #ffa500)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          Rialo AI Assistant
        </h1>
        <p style={{ 
          color: 'rgba(255,255,255,0.6)', 
          marginBottom: '40px', 
          textAlign: 'center', 
          fontSize: '15px',
          maxWidth: '500px',
          lineHeight: '1.5'
        }}>
          Execute highly optimized on-chain operations using natural language. Fast, secure, and intent-driven.
        </p>

        <div style={{ width: '100%', display: 'flex', justifyContent: 'center' }}>
          <AiAgent />
        </div>
      </main>
    </div>
  );
}
