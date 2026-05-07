import React, { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { useWallet } from '../hooks/useWallet';

// ─── Alamat Kontrak ──────────────────────────────────────────────────
const USDC_ADDRESS = '0x14064d2b438ed62d00c62f57f9fa77ddd0f770bb' as `0x${string}`;
const XAUT_ADDRESS = '0x09213033579472F2B13ce9b2a52c826b901efFd8' as `0x${string}`;
const USDC_DECIMALS = 6;
const XAUT_DECIMALS = 18;

// ─── ABI Fragments ───────────────────────────────────────────────────
const erc20BalanceOfAbi = [
    { name: 'balanceOf', type: 'function', stateMutability: 'view', inputs: [{ name: 'account', type: 'address' }], outputs: [{ name: 'balance', type: 'uint256' }] },
] as const;

const erc20ApproveAbi = [
    { name: 'approve', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'spender', type: 'address' }, { name: 'amount', type: 'uint256' }], outputs: [{ name: '', type: 'bool' }] },
] as const;

const buyXAUtAbi = [
    { name: 'buyXAUt', type: 'function', stateMutability: 'nonpayable', inputs: [{ name: 'usdcAmount', type: 'uint256' }, { name: 'xautToMint', type: 'uint256' }], outputs: [] },
] as const;

export default function RwaHubTab() {
    const { addTransaction, showToast } = useWallet();
    const [usdInput, setUsdInput] = useState('');
    const [goldPrice, setGoldPrice] = useState<number>(0);
    const [txStep, setTxStep] = useState<'idle' | 'approving' | 'buying' | 'done'>('idle');

    const { address } = useAccount();

    // ─── STYLING HELPERS ─────────────────────────────────────────────
    const accent = '#a9ddd3';
    const bgDark = '#010101';
    const inputBg = '#060606';
    const accentText = { color: accent };

    const RwaIcon = ({ src, symbol, isComingSoon = false }: { src: string, symbol: string, isComingSoon?: boolean }) => (
        <div className={`w-12 h-12 rounded-full flex items-center justify-center overflow-hidden border border-white/10 p-1.5 ${isComingSoon ? 'bg-white/5 grayscale' : 'bg-white/10 shadow-[0_0_20px_rgba(169,221,211,0.05)]'}`}>
            <img
                src={src}
                alt={symbol}
                className="w-full h-full object-contain"
                onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://cdn-icons-png.flaticon.com/512/2489/2489756.png';
                }}
            />
        </div>
    );

    // ─── LOGIKA DATA ─────────────────────────────────────────────────
    const { data: rawUsdcBalance } = useReadContract({
        address: USDC_ADDRESS, abi: erc20BalanceOfAbi, functionName: 'balanceOf', args: address ? [address] : undefined, chainId: 11155111, query: { enabled: !!address, refetchInterval: 5000 },
    });

    const portfolioValue = rawUsdcBalance ? parseFloat(formatUnits(rawUsdcBalance, USDC_DECIMALS)) : 0;
    const safePortfolioValue = isNaN(portfolioValue) ? 0 : portfolioValue;
    const portfolioValueDisplay = safePortfolioValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // 1. FETCH HARGA EMAS SAKTI (ANTI LOADING TERUS)
    useEffect(() => {
        let isMounted = true;
        const fetchGoldPrice = async () => {
            try {
                const res = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether-gold&vs_currencies=usd');
                if (!res.ok) throw new Error("Rate limit hit");
                const data = await res.json();
                if (isMounted && data?.['tether-gold']?.usd) {
                    setGoldPrice(data['tether-gold'].usd);
                } else if (isMounted) {
                    setGoldPrice(2350.00); // Fallback jika JSON aneh
                }
            } catch (err) {
                console.warn('CoinGecko limit. Menggunakan harga emas fallback.', err);
                if (isMounted) setGoldPrice(2350.00); // 👈 BAN SEREP JIKA API LIMIT
            }
        };
        fetchGoldPrice();
        const interval = setInterval(fetchGoldPrice, 30000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, []);

    const inputAmount = parseFloat(usdInput) || 0;
    const estimatedXAUt = goldPrice > 0 ? inputAmount / goldPrice : 0;

    const { writeContract: writeApprove, data: approveHash } = useWriteContract();
    const { writeContract: writeBuy, data: buyHash } = useWriteContract();

    // 2. PENANGANAN ERROR METAMASK (ANTI NYANGKUT)
    const { isSuccess: approveConfirmed, isError: approveError } = useWaitForTransactionReceipt({ hash: approveHash });
    const { isSuccess: buyConfirmed, isError: buyError } = useWaitForTransactionReceipt({ hash: buyHash });

    useEffect(() => {
        if (approveError) setTxStep('idle'); // Balik ke awal kalau user nolak Approve
    }, [approveError]);

    useEffect(() => {
        if (buyError) setTxStep('idle'); // Balik ke awal kalau user nolak Buy
    }, [buyError]);

    useEffect(() => {
        if (approveConfirmed && txStep === 'approving') {
            setTxStep('buying');
            const usdcBigInt = parseUnits(Number(inputAmount).toFixed(USDC_DECIMALS), USDC_DECIMALS);
            const xautBigInt = parseUnits(Number(estimatedXAUt).toFixed(XAUT_DECIMALS), XAUT_DECIMALS);
            writeBuy({ address: XAUT_ADDRESS, abi: buyXAUtAbi, functionName: 'buyXAUt', args: [usdcBigInt, xautBigInt], chainId: 11155111 });
        }
    }, [approveConfirmed]);

    useEffect(() => {
        if (buyConfirmed && txStep === 'buying') {
            setTxStep('done');
            addTransaction({ type: 'Swap', details: 'Buy XAUt', amount: `${inputAmount} USDC -> ${estimatedXAUt.toFixed(4)} XAUt`, txHash: buyHash });

            // 👇 INI DIA SUNTIKAN NOTIFIKASI ELEGANNYA 👇
            showToast({ message: 'Buy XAUt Successful!', detail: `Converted ${inputAmount} USDC to XAUt`, type: 'success', txHash: buyHash });

            setUsdInput('');
            setTimeout(() => setTxStep('idle'), 3000);
        }
    }, [buyConfirmed]);

    const handleBuyXAUt = () => {
        if (!address || inputAmount <= 0 || goldPrice <= 0 || inputAmount > safePortfolioValue) return;
        setTxStep('approving');
        const usdcBigInt = parseUnits(Number(inputAmount).toFixed(USDC_DECIMALS), USDC_DECIMALS);
        writeApprove({ address: USDC_ADDRESS, abi: erc20ApproveAbi, functionName: 'approve', args: [XAUT_ADDRESS, usdcBigInt], chainId: 11155111 });
    };

    return (
        <div className="rounded-2xl p-8 border border-white/5 w-full" style={{ backgroundColor: bgDark, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* STATS HEADER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="p-6 rounded-2xl border border-white/5" style={{ backgroundColor: inputBg }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Total Portfolio Value</p>
                    <h2 className="text-4xl font-black text-white">${portfolioValueDisplay} <span className="text-lg text-white/40">USD</span></h2>
                </div>
                <div className="p-6 rounded-2xl border border-white/5" style={{ backgroundColor: inputBg }}>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-2">Historical Growth (p.a)</p>
                    <h2 className="text-4xl font-black" style={accentText}>8 - 10%</h2>
                </div>
            </div>

            {/* RWA ASSET LIST */}
            <div className="flex flex-col space-y-3 mb-8">

                {/* 1. TOKENIZED GOLD */}
                <div className="border border-white/5 p-5 rounded-2xl flex justify-between items-center hover:border-white/20 transition-all cursor-pointer shadow-xl" style={{ backgroundColor: inputBg }}>
                    <div className="flex items-center space-x-5">
                        <RwaIcon src="https://raw.githubusercontent.com/trustwallet/assets/master/blockchains/ethereum/assets/0x68749665FF8D2d112Fa859AA293F07A622782F38/logo.png" symbol="XAUt" />
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-black text-white text-base uppercase tracking-widest leading-none">Tokenized Gold</h3>
                                <span className="text-[9px] text-white/40 font-black tracking-widest">XAUt</span>
                            </div>
                            <div className="flex space-x-2 mt-2">
                                <span className="text-[8px] px-2 py-0.5 rounded font-black tracking-widest uppercase" style={{ backgroundColor: 'rgba(169, 221, 211, 0.12)', color: '#a9ddd3' }}>SAFE HAVEN APY</span>
                                <span className="text-[8px] px-2 py-0.5 rounded font-black tracking-widest uppercase" style={{ backgroundColor: 'rgba(169, 221, 211, 0.12)', color: '#a9ddd3' }}>HEDGE RISK</span>
                            </div>
                        </div>
                    </div>
                    <div className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0" style={{ borderColor: '#a9ddd3' }}>
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: '#a9ddd3' }} />
                    </div>
                </div>

                {/* 2. US TREASURIES (COMING SOON) */}
                <div className="opacity-40 cursor-not-allowed border border-white/5 p-5 rounded-2xl flex justify-between items-center" style={{ backgroundColor: inputBg }}>
                    <div className="flex items-center space-x-5">
                        <RwaIcon src="https://cdn-icons-png.flaticon.com/512/2830/2830284.png" symbol="TBILL" isComingSoon={true} />
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-black text-white text-base uppercase tracking-widest leading-none">US Treasuries</h3>
                                <span className="text-[9px] text-white/40 font-black tracking-widest">TBILL</span>
                                <span className="bg-white/10 text-[8px] px-2 py-0.5 rounded text-white/60 font-black tracking-widest uppercase">COMING SOON</span>
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-2">5.2% APY • LOW RISK</p>
                        </div>
                    </div>
                </div>

                {/* 3. REAL ESTATE (COMING SOON) */}
                <div className="opacity-40 cursor-not-allowed border border-white/5 p-5 rounded-2xl flex justify-between items-center" style={{ backgroundColor: inputBg }}>
                    <div className="flex items-center space-x-5">
                        <RwaIcon src="https://cdn-icons-png.flaticon.com/512/602/602190.png" symbol="REST" isComingSoon={true} />
                        <div>
                            <div className="flex items-center space-x-2">
                                <h3 className="font-black text-white text-base uppercase tracking-widest leading-none">Real Estate</h3>
                                <span className="text-[9px] text-white/40 font-black tracking-widest">REST</span>
                                <span className="bg-white/10 text-[8px] px-2 py-0.5 rounded text-white/60 font-black tracking-widest uppercase">COMING SOON</span>
                            </div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-white/40 mt-2">8.0% APY • MEDIUM RISK</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* BUY PANEL */}
            <div className="border border-white/5 p-6 rounded-2xl" style={{ backgroundColor: inputBg }}>
                <div className="flex justify-between items-center mb-6">
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Buy Tokenized Gold</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-white/40">
                        Price: <span style={accentText}>{goldPrice > 0 ? `$${goldPrice.toLocaleString('en-US', { minimumFractionDigits: 2 })}/oz` : 'Loading...'}</span>
                    </p>
                </div>

                <div className="rounded-2xl p-6 mb-4 border border-white/5 focus-within:border-white/20 transition-all" style={{ backgroundColor: '#040404' }}>
                    <div className="flex justify-between items-center mb-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/30">You Pay</span>
                        <button onClick={() => setUsdInput(safePortfolioValue.toFixed(2))} className="text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full text-[#a9ddd3] bg-[#a9ddd3]/10 hover:bg-[#a9ddd3]/20 transition-all">MAX</button>
                    </div>
                    <div className="flex items-center justify-between">
                        <input type="number" value={usdInput} onChange={(e) => setUsdInput(e.target.value)} className="bg-transparent border-none p-0 text-4xl font-black w-full focus:ring-0 text-white placeholder:text-white/10 outline-none" placeholder="0.00" />
                        <span className="text-sm font-black text-white/40 tracking-widest">USDC</span>
                    </div>
                </div>

                <div className="rounded-2xl p-6 mb-6 border border-white/5" style={{ backgroundColor: '#040404' }}>
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/30 block mb-4">You Receive (Est.)</span>
                    <div className="flex items-center justify-between">
                        <p className="text-4xl font-black" style={accentText}>{estimatedXAUt > 0 ? estimatedXAUt.toFixed(4) : '0.0000'}</p>
                        <span className="text-sm font-black text-white/40 tracking-widest uppercase">XAUt</span>
                    </div>
                </div>

                <button
                    disabled={!address || inputAmount <= 0 || goldPrice <= 0 || inputAmount > safePortfolioValue || txStep !== 'idle'}
                    onClick={handleBuyXAUt}
                    className="w-full py-5 rounded-2xl text-[13px] font-black uppercase tracking-widest transition-all shadow-2xl disabled:opacity-50 hover:brightness-110"
                    style={(!address || inputAmount <= 0 || goldPrice <= 0 || inputAmount > safePortfolioValue || txStep !== 'idle') ? { backgroundColor: '#333', color: '#888' } : { backgroundColor: accent, color: bgDark }}
                >
                    {txStep === 'approving' ? 'Approving USDC...' : txStep === 'buying' ? 'Buying XAUt...' : txStep === 'done' ? '✅ Success!' : 'Buy XAUt'}
                </button>
            </div>
        </div>
    );
}