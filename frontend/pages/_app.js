import '../styles/globals.css';
import '../styles/navbar.css';
import { WalletProvider } from '../hooks/useWallet';
import Head from 'next/head';
import GlobalToast from '../components/GlobalToast';
import ActiveTasks from '../components/ActiveTasks';

export default function App({ Component, pageProps }) {
  return (
    <WalletProvider>
      <GlobalToast />
      <ActiveTasks />
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Manrope:wght@700;800&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet" />
        <title>Rialo | The Architectural Void of Layer 1</title>
      </Head>
      <Component {...pageProps} />
    </WalletProvider>
  );
}
