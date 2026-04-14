import React from 'react';
import { Fuel } from 'lucide-react';
import { useWallet } from '../hooks/useWallet';

export default function GasWidget() {
  const { gasUsd } = useWallet();

  return (
    <div className="gas-widget">
      <style dangerouslySetInnerHTML={{ __html: `
        .gas-widget {
          background: rgba(15, 15, 15, 0.6);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 20px;
          padding: 16px 20px;
          display: flex;
          flex-direction: column;
          gap: 8px;
          min-width: 180px;
          transition: all 0.3s ease;
        }

        .gas-widget:hover {
          background: rgba(20, 20, 20, 0.8);
          border-color: rgba(255, 255, 255, 0.1);
          transform: translateY(-2px);
        }

        .gas-label {
          font-size: 10px;
          font-weight: 900;
          color: rgba(255, 255, 255, 0.3);
          text-transform: uppercase;
          letter-spacing: 0.15em;
        }

        .gas-value-container {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .gas-icon-wrapper {
          color: rgba(255, 255, 255, 0.4);
        }

        .gas-value {
          font-size: 20px;
          font-weight: 800;
          color: #fff;
          letter-spacing: -0.02em;
        }

        .gas-unit {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
          font-weight: 700;
          margin-left: 4px;
        }

        .gas-pulse {
          width: 6px;
          height: 6px;
          background: #10b981;
          border-radius: 50%;
          display: inline-block;
          margin-right: 8px;
          box-shadow: 0 0 8px #10b981;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }
      `}} />

      <p className="gas-label">
        <span className="gas-pulse"></span>
        Gas Estimation
      </p>
      
      <div className="gas-value-container">
        <div className="gas-icon-wrapper">
          <Fuel size={20} strokeWidth={2.5} />
        </div>
        <div className="gas-value">
          ${gasUsd}
          <span className="gas-unit">USD</span>
        </div>
      </div>
    </div>
  );
}
