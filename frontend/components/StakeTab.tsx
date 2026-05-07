import React, { useState, useEffect } from 'react';
import { useStaking } from '../hooks/useStaking';
import useRwaStaking from '../hooks/useRwaStaking';
import { useWallet } from '../hooks/useWallet';
import { useRLO } from '../hooks/useRLO';

export default function StakeTab() {
    const { provider, addTransaction, balances: walletBalances } = useWallet();
    const { balance: rloBal } = useRLO();
    const { stakeRlo, stakeEth, stakePair, withdraw, loading } = useStaking();
    const { calculateRwaYield, getApyForDuration } = useRwaStaking(provider);

    const [activeAction, setActiveAction] = useState('stake');
    const [selectedTier, setSelectedTier] = useState('single_rlo');
    const [amount, setAmount] = useState('');
    const [pairRlo, setPairRlo] = useState('');
    const [pairEth, setPairEth] = useState('');

    const [lockDuration, setLockDuration] = useState(48);
    const [sfsFraction, setSfsFraction] = useState(16);
    const [payoutPref, setPayoutPref] = useState('rlo');
    const [ethPrice, setEthPrice] = useState(0);
    const [estimatedApy, setEstimatedApy] = useState(12);
    const [upfrontReward, setUpfrontReward] = useState(0);

    // ─── STYLING HELPERS ─────────────────────────────────────────────
    const accent = '#a9ddd3';
    const bgDark = '#010101';
    const inputBg = '#060606';
    const accentText = { color: accent };

    const TokenIcon = ({ src, symbol }: { src: string, symbol: string }) => (
        <div className="w-6 h-6 rounded-full flex items-center justify-center overflow-hidden bg-white/5 border border-white/10 p-0.5">
            <img src={src} alt={symbol} className="w-full h-full object-contain" />
        </div>
    );

    useEffect(() => {
        const fetchEthPrice = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
                const data = await res.json();
                setEthPrice(data.ethereum.usd);
            } catch (error) { setEthPrice(3000); }
        };
        fetchEthPrice();
    }, []);

    useEffect(() => {
        let baseApy = 12.0;
        if (selectedTier === 'single_eth') baseApy = 4.0;
        else if (selectedTier === 'pair') baseApy = 8.0;
        const currentApy = baseApy + (10.0 * (lockDuration - 1) / 47);
        setEstimatedApy(currentApy);

        if (selectedTier === 'pair') {
            const amountInUsd = (parseFloat(pairRlo) || 0) + ((parseFloat(pairEth) || 0) * ethPrice);
            setUpfrontReward((currentApy / 12 / 100) * lockDuration * amountInUsd);
        } else {
            const activePrice = selectedTier === 'single_eth' ? ethPrice : 1;
            const amountInUsd = (parseFloat(amount) || 0) * activePrice;
            setUpfrontReward((currentApy / 12 / 100) * lockDuration * amountInUsd);
        }
    }, [amount, pairRlo, pairEth, lockDuration, selectedTier, ethPrice]);

    const handleMaxSingle = () => {
        if (selectedTier === 'single_rlo') {
            setAmount(rloBal.toString());
        } else {
            const maxEth = Math.max(0, parseFloat(walletBalances.ETH) - 0.01);
            setAmount(maxEth.toFixed(6));
        }
    };

    const handleMaxPair = () => {
        if (ethPrice <= 0) return;
        const limitByRlo = parseFloat(rloBal);
        const ethNeededForRlo = limitByRlo / ethPrice;
        const limitByEth = Math.max(0, parseFloat(walletBalances.ETH) - 0.01);
        const rloNeededForEth = limitByEth * ethPrice;

        if (ethNeededForRlo <= limitByEth) {
            setPairRlo(limitByRlo.toString());
            setPairEth(ethNeededForRlo.toFixed(6));
        } else {
            setPairRlo(rloNeededForEth.toFixed(2));
            setPairEth(limitByEth.toFixed(6));
        }
    };

    const handlePairRloChange = (val: string) => {
        const cleanVal = val.replace(/[^0-9.]/g, '');
        setPairRlo(cleanVal);
        if (cleanVal && ethPrice > 0) setPairEth((parseFloat(cleanVal) / ethPrice).toFixed(6));
        else setPairEth('');
    };

    const handlePairEthChange = (val: string) => {
        const cleanVal = val.replace(/[^0-9.]/g, '');
        setPairEth(cleanVal);
        if (cleanVal && ethPrice > 0) setPairRlo((parseFloat(cleanVal) * ethPrice).toFixed(2));
        else setPairRlo('');
    };
    // --- KALKULATOR RWA (STABLECOIN) AKURAT ---
    const activeRwaApy = estimatedApy * (selectedTier === 'single_rlo' ? 15 / 22 : selectedTier === 'pair' ? 12 / 18 : 9 / 14);

    let currentUsdValue = 0;
    if (selectedTier === 'pair') currentUsdValue = (parseFloat(pairRlo) || 0) + ((parseFloat(pairEth) || 0) * ethPrice);
    else if (selectedTier === 'single_eth') currentUsdValue = (parseFloat(amount) || 0) * ethPrice;
    else currentUsdValue = parseFloat(amount) || 0;

    const accurateRwaYield = (activeRwaApy / 12 / 100) * lockDuration * currentUsdValue;

    const handleStakeClick = async () => {
        let usdValue = 0;
        if (selectedTier === 'pair') usdValue = (parseFloat(pairRlo) || 0) + ((parseFloat(pairEth) || 0) * ethPrice);
        else if (selectedTier === 'single_eth') usdValue = (parseFloat(amount) || 0) * ethPrice;
        else usdValue = parseFloat(amount) || 0;

        let usdcAmount = 0;
        let stRloAmount = 0;
        let creditAmount = 0;

        if (payoutPref === 'rwa') {
            const totalRwaYield = accurateRwaYield; // Pake rumus akurat yang baru kita buat
            usdcAmount = (totalRwaYield * (100 - sfsFraction)) / 100;
            stRloAmount = 0;
            creditAmount = ((totalRwaYield * sfsFraction) / 100) * 500;
        } else {
            usdcAmount = 0;
            stRloAmount = (upfrontReward * (100 - sfsFraction)) / 100;
            creditAmount = ((upfrontReward * sfsFraction) / 100) * 500;
        }

        try {
            if (selectedTier === 'single_rlo') {
                if (!amount || parseFloat(amount) <= 0) return;
                await stakeRlo(amount, lockDuration, usdcAmount, stRloAmount, creditAmount);
                addTransaction({ type: 'Stake', details: `Staked ${amount} RLO`, amount: `${amount} RLO`, txHash: '...' });
            } else if (selectedTier === 'single_eth') {
                if (!amount || parseFloat(amount) <= 0) return;
                await stakeEth(amount, lockDuration, usdcAmount, stRloAmount, creditAmount);
                addTransaction({ type: 'Stake', details: `Staked ${amount} ETH`, amount: `${amount} ETH`, txHash: '...' });
            } else if (selectedTier === 'pair') {
                if (!pairRlo || !pairEth || parseFloat(pairRlo) <= 0) return;
                await stakePair(pairRlo, pairEth, lockDuration, usdcAmount, stRloAmount, creditAmount);
                addTransaction({ type: 'Stake', details: `Staked Pair ${pairRlo} RLO / ${pairEth} ETH`, amount: `Pair`, txHash: '...' });
            }
        } catch (error) {
            console.error("Stake Failed", error);
        }
    };

    const isEth = selectedTier === 'single_eth';
    const activeSymbol = isEth ? 'ETH' : 'RLO';
    const activeImg = isEth ? '/eth-icon.png' : '/rialo-icon.png';
    const isStakeDisabled = loading || (selectedTier === 'pair' ? (!pairRlo || !pairEth || parseFloat(pairRlo) <= 0) : (!amount || parseFloat(amount) <= 0));

    return (
        <div className="rounded-2xl p-8 border border-white/5 w-full relative mb-12" style={{ backgroundColor: bgDark, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            <div className="flex gap-1 p-1 rounded-full mb-8 border border-white/5" style={{ backgroundColor: inputBg }}>
                {['stake', 'unstake'].map(act => (
                    <button key={act} onClick={() => setActiveAction(act)} className={`flex-1 font-black text-[10px] uppercase tracking-widest py-3 rounded-full transition-all ${activeAction === act ? 'bg-white text-black shadow-md' : 'text-white/40 hover:text-white'}`}>
                        {act}
                    </button>
                ))}
            </div>

            {activeAction === 'stake' ? (
                <div className="space-y-6">
                    <div className="flex flex-col md:flex-row gap-3">
                        {[
                            { id: 'single_rlo', title: 'Single RLO', sub: 'MAX YIELD' },
                            { id: 'pair', title: 'Pair (RLO+ETH)', sub: 'BALANCED' },
                            { id: 'single_eth', title: 'Single ETH', sub: 'BASE TIER' }
                        ].map(tier => (
                            <div key={tier.id} onClick={() => setSelectedTier(tier.id)} className={`flex-1 p-4 rounded-2xl border transition-all cursor-pointer ${selectedTier === tier.id ? 'border-white bg-white/5' : 'border-white/5 bg-[#060606] hover:border-white/20'}`}>
                                <h3 className="text-xs font-black uppercase tracking-widest text-white mb-1">{tier.title}</h3>
                                <p className="text-[9px] font-black uppercase tracking-widest" style={accentText}>{tier.sub}</p>
                            </div>
                        ))}
                    </div>

                    {selectedTier === 'pair' ? (
                        <div className="space-y-2 relative">
                            <div className="rounded-2xl p-6 border border-white/5 focus-within:border-white/20 transition-all" style={{ backgroundColor: inputBg }}>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 block">RLO Amount (50%)</label>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <input type="text" value={pairRlo} onChange={(e) => handlePairRloChange(e.target.value)} className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 outline-none" placeholder="0.0" />
                                        {/* USD VALUE UNTUK PAIR RLO */}
                                        {pairRlo && parseFloat(pairRlo) > 0 && (
                                            <div className="text-[11px] font-bold text-white/30 mt-1">
                                                ≈ ${(parseFloat(pairRlo) * 1).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex gap-2 shrink-0">
                                        <button type="button" onClick={handleMaxPair} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white">MAX</button>
                                        <div className="px-4 py-2 rounded-full border border-white/5 bg-white/5 flex items-center gap-2">
                                            <TokenIcon src="/rialo-icon.png" symbol="RLO" />
                                            <span className="text-[10px] font-black text-white">RLO</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full" style={{ backgroundColor: bgDark }}>
                                <div className="w-8 h-8 rounded-full flex items-center justify-center border border-white/10" style={{ backgroundColor: inputBg }}>
                                    <span className="text-[10px] font-black" style={accentText}>➕</span>
                                </div>
                            </div>
                            <div className="rounded-2xl p-6 border border-white/5 focus-within:border-white/20 transition-all" style={{ backgroundColor: inputBg }}>
                                <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 block">ETH Amount (50%)</label>
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <input type="text" value={pairEth} onChange={(e) => handlePairEthChange(e.target.value)} className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 outline-none" placeholder="0.0" />
                                        {/* USD VALUE UNTUK PAIR ETH */}
                                        {pairEth && parseFloat(pairEth) > 0 && (
                                            <div className="text-[11px] font-bold text-white/30 mt-1">
                                                ≈ ${(parseFloat(pairEth) * ethPrice).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                            </div>
                                        )}
                                    </div>
                                    <div className="px-4 py-2 rounded-full border border-white/5 bg-white/5 flex items-center gap-2 shrink-0">
                                        <TokenIcon src="/eth-icon.png" symbol="ETH" />
                                        <span className="text-[10px] font-black text-white">ETH</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="rounded-2xl p-6 border border-white/5 focus-within:border-white/20 transition-all" style={{ backgroundColor: inputBg }}>
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4 block">{activeSymbol} Amount</label>
                            <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <input type="text" value={amount} onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))} className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 outline-none" placeholder="0.0" />
                                    {/* USD VALUE UNTUK SINGLE RLO / ETH */}
                                    {amount && parseFloat(amount) > 0 && (
                                        <div className="text-[11px] font-bold text-white/30 mt-1">
                                            ≈ ${(parseFloat(amount) * (isEth ? ethPrice : 1)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                                        </div>
                                    )}
                                </div>
                                <div className="flex gap-2 shrink-0">
                                    <button type="button" onClick={handleMaxSingle} className="px-4 py-2 rounded-full border border-white/5 bg-white/5 hover:bg-white/10 text-[10px] font-black text-white">MAX</button>
                                    <div className="px-4 py-2 rounded-full border border-white/5 bg-white/5 flex items-center gap-2">
                                        <TokenIcon src={activeImg} symbol={activeSymbol} />
                                        <span className="text-[10px] font-black text-white">{activeSymbol}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="space-y-3">
                        <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: inputBg }}>
                            <div className="flex justify-between mb-4"><span className="text-[10px] font-black uppercase tracking-widest text-white/40">Lock Duration</span><span className="text-xs font-black text-white">{lockDuration} Months</span></div>
                            <input type="range" min="1" max="48" value={lockDuration} onChange={(e) => setLockDuration(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#a9ddd3]" />
                        </div>
                        <div className="rounded-2xl p-6 border border-white/5" style={{ backgroundColor: inputBg }}>
                            <div className="flex justify-between mb-4"><span className="text-[10px] font-black uppercase tracking-widest text-white/40">SFS Routing Fraction</span><span className="text-xs font-black" style={accentText}>{sfsFraction}%</span></div>
                            <input type="range" min="0" max="100" value={sfsFraction} onChange={(e) => setSfsFraction(parseInt(e.target.value))} className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-[#a9ddd3]" />
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row gap-3">
                        <div onClick={() => setPayoutPref('rlo')} className={`flex-1 p-5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${payoutPref === 'rlo' ? 'border-white bg-white/5' : 'border-white/5 bg-[#060606] hover:border-white/20'}`}>
                            <span className="text-xs font-black uppercase tracking-widest text-white">Payout in stRLO</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/40">High APY</span>
                        </div>
                        <div onClick={() => setPayoutPref('rwa')} className={`flex-1 p-5 rounded-2xl border cursor-pointer flex justify-between items-center transition-all ${payoutPref === 'rwa' ? 'border-white bg-white/5' : 'border-white/5 bg-[#060606] hover:border-white/20'}`}>
                            <span className="text-xs font-black uppercase tracking-widest text-white">Payout in RWA</span>
                            <span className="text-[9px] font-black uppercase tracking-widest" style={accentText}>Stable</span>
                        </div>
                    </div>

                    {/* 5. SUMMARY (DETAILS) */}
                    <div className="space-y-4 px-2 mt-4 bg-white/[0.02] p-4 rounded-xl border border-white/5">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Estimated APY</span>
                            <span className="text-sm font-black text-white">
                                {payoutPref === 'rwa' ? `${activeRwaApy.toFixed(0)}%` : `${estimatedApy.toFixed(0)}%`}
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">Yield to Wallet</span>
                            <span className="text-sm font-black" style={accentText}>
                                {payoutPref === 'rwa'
                                    ? `${((accurateRwaYield * (100 - sfsFraction)) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} USDC`
                                    : `${((upfrontReward * (100 - sfsFraction)) / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })} stRLO`
                                }
                            </span>
                        </div>
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-black uppercase tracking-widest text-white/30">AI Credits (SFS)</span>
                            <span className="text-sm font-black text-white">
                                {payoutPref === 'rwa'
                                    ? `${(((accurateRwaYield * sfsFraction) / 100) * 500).toLocaleString('en-US', { maximumFractionDigits: 0 })} Credits`
                                    : `${(((upfrontReward * sfsFraction) / 100) * 500).toLocaleString('en-US', { maximumFractionDigits: 0 })} Credits`
                                }
                            </span>
                        </div>
                    </div>

                    <button
                        onClick={handleStakeClick}
                        disabled={isStakeDisabled}
                        className="w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-[0.15em] transition-all shadow-2xl hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: isStakeDisabled ? '#333' : accent, color: isStakeDisabled ? '#888' : bgDark }}
                    >
                        {loading ? 'Processing...' : `Stake ${selectedTier === 'pair' ? 'Pair' : activeSymbol}`}
                    </button>
                </div>
            ) : (
                <div className="p-10 border border-white/5 text-center rounded-2xl" style={{ backgroundColor: inputBg }}>
                    <h3 className="text-xl font-black uppercase tracking-widest text-white mb-2">Withdraw Deposit</h3>
                    <button onClick={withdraw} className="w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-widest border border-red-500 text-red-500 hover:bg-red-500/10 transition-all">Unstake & Withdraw</button>
                </div>
            )}
        </div>
    );
}