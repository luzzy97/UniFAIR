import '../styles/globals.css';
import '../styles/navbar.css';
import { WalletProvider } from '../hooks/useWallet';
import Head from 'next/head';
import GlobalToast from '../components/GlobalToast';
import ActiveTasks from '../components/ActiveTasks';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { sepolia } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient();

const wagmiConfig = createConfig({
  chains: [sepolia],
  transports: {
    [sepolia.id]: http(),
  },
});

export default function App({ Component, pageProps }) {
  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <WalletProvider>
          <GlobalToast />
          <ActiveTasks />
          <Head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
            <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
            <title>UniFAIR | Intelligent DeFi Hub</title>
          </Head>
          <Component {...pageProps} />
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
