import React, { useState } from 'react';

export default function RwaHubTab() {
    const [allocation, setAllocation] = useState(100);
    const [selectedAsset, setSelectedAsset] = useState('xaut'); // Default ke Gold

    return (
        <div className="flex flex-col space-y-6 w-full max-w-2xl mx-auto p-4">

            {/* 1. HEADER STATS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Total Portfolio Value</p>
                    <h2 className="text-4xl font-black text-white mt-2">$0.00 <span className="text-lg text-white/40">USD</span></h2>
                </div>
                <div className="bg-zinc-900 border border-white/5 p-6 rounded-3xl">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Average Yield</p>
                    <h2 className="text-4xl font-black text-white mt-2">0.00%</h2>
                </div>
            </div>

            {/* 2. ASSET LIST */}
            <div className="flex flex-col space-y-3">

                {/* US Treasuries - Coming Soon */}
                <div className="bg-zinc-800/50 opacity-50 cursor-not-allowed border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center text-xl">🏛️</div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-white text-lg">US Treasuries</h3>
                                <span className="text-[10px] text-white/40 font-bold">TBILL</span>
                                <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded text-white/60">COMING SOON</span>
                            </div>
                            <p className="text-xs text-white/40 mt-1">5.2% APY • LOW RISK</p>
                        </div>
                    </div>
                </div>

                {/* Real Estate - Coming Soon */}
                <div className="bg-zinc-800/50 opacity-50 cursor-not-allowed border border-white/5 p-5 rounded-2xl flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-zinc-700 rounded-full flex items-center justify-center text-xl">🏢</div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-white text-lg">Real Estate</h3>
                                <span className="text-[10px] text-white/40 font-bold">REST</span>
                                <span className="bg-white/10 text-[10px] px-2 py-0.5 rounded text-white/60">COMING SOON</span>
                            </div>
                            <p className="text-xs text-white/40 mt-1">8.0% APY • MEDIUM RISK</p>
                        </div>
                    </div>
                </div>

                {/* Tokenized Gold - ACTIVE */}
                <div className="bg-black border-2 border-white p-5 rounded-2xl flex justify-between items-center shadow-xl shadow-white/5 cursor-pointer">
                    <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-zinc-800 rounded-full flex items-center justify-center text-xl">💳</div>
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-bold text-white text-lg">Tokenized Gold</h3>
                                <span className="text-[10px] text-white/40 font-bold">XAUt</span>
                            </div>
                            <div className="flex space-x-2 mt-1">
                                <span className="bg-white/10 text-[9px] px-2 py-0.5 rounded text-white/80 font-bold">SAFE HAVEN APY</span>
                                <span className="bg-white/10 text-[9px] px-2 py-0.5 rounded text-white/80 font-bold">HEDGE RISK</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 border-white flex items-center justify-center">
                        <div className="w-3 h-3 bg-white rounded-full"></div>
                    </div>
                </div>
            </div>

            {/* 3. ALLOCATION SLIDER */}
            <div className="bg-zinc-900/50 border border-white/5 p-6 rounded-3xl mt-4">
                <div className="flex justify-between items-center mb-6">
                    <p className="text-white/40 text-xs font-bold uppercase tracking-widest">Allocation Amount</p>
                    <p className="text-white font-bold">Allocating {allocation}% <span className="text-white/40 font-normal">(~$ 0.00)</span></p>
                </div>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={allocation}
                    onChange={(e) => setAllocation(parseInt(e.target.value))}
                    className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
                />
                <div className="flex justify-between mt-4 text-[10px] text-white/20 font-bold">
                    <span>0%</span>
                    <span>50%</span>
                    <span>100%</span>
                </div>
            </div>

        </div>
    );
}