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
            <title>UniFAIR | Unified DeFi</title>
            <meta name="description" content="Intelligent DeFi Hub" />
            <link rel="icon" href="/favicon.ico" />
          </Head>
          <Component {...pageProps} />
        </WalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
