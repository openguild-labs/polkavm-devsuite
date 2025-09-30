# PolkaVM DevTool -  Bridge

A modern web application for bridging tokens between Polkadot parachains and PolkaVM Asset Hub. Built with Next.js, React, and Polkadot API.

## Getting Started

### Prerequisites

- Node.js 22+ 
- pnpm (recommended) or npm
- Polkadot wallet extension (Polkadot.js, Talisman, or SubWallet)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd token-bridge
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Install papi descriptor
```bash
npx papi generate
```

4. Start the development server:
```bash
pnpm dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Building for Production

The build process automatically generates Polkadot API descriptors and builds the application:

```bash
pnpm build
```


## Environment Variables

Create a `.env.local` file with the following variables:

```env
# WalletConnect Project ID (get from https://cloud.walletconnect.com/)
NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID=your_project_id

# Optional: Ignore localStorage in development
NEXT_PUBLIC_IGNORE_STORAGE=false
```

