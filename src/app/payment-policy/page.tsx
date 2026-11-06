import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { CreditCard, AlertCircle, CheckCircle2, ShieldAlert, Clock, Layers, Zap } from 'lucide-react';
import { OFFICIAL_CONTRACTS } from '@/lib/payments/cryptoConfig';

export const metadata: Metadata = {
  title: 'Payment & Crypto Policy — DocuNexa',
  description:
    'Comprehensive technical and legal policy for DocuNexa payments, supported USDT stablecoin rails (Polygon, Aptos), exact amount matching, and planned international methods.',
  alternates: {
    canonical: 'https://docunexa.pro.et/payment-policy',
  },
};

const TOC = [
  { id: 'overview', title: '1. Payment Architecture Overview' },
  { id: 'pricing-model', title: '2. Product Pricing & Coupon Discounts' },
  { id: 'active-methods', title: '3. Currently Active Payment Rails' },
  { id: 'polygon-usdt', title: '3.1 USDT on Polygon (PoS)' },
  { id: 'aptos-usdt', title: '3.2 USDT on Aptos Mainnet' },
  { id: 'planned-methods', title: '4. Planned International Payment Rails (Disabled)' },
  { id: 'tron-usdt', title: '4.1 Planned: USDT on TRON (TRC20)' },
  { id: 'polygon-usdc', title: '4.2 Planned: Native USDC on Polygon PoS' },
  { id: 'exact-amount', title: '5. Unique Fractional Amount & Anti-Collision' },
  { id: 'window-expiration', title: '6. The 20-Minute Window & Block Confirmations' },
  { id: 'verification-process', title: '7. Server-to-Server Verification (No Screenshots)' },
  { id: 'transaction-fees', title: '8. Network Gas Fees & Exchange Deductions' },
  { id: 'payment-exceptions', title: '9. Crypto Refunds, Disputes & Exception Handling' },
  { id: 'compliance-notice', title: '10. Sanctions & Regulatory Compliance' },
  { id: 'contact', title: '11. Payment Assistance Contact' },
];

export default function PaymentPolicyPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Payment & Crypto Policy"
      subtitle="Detailed technical and consumer rules for international cryptocurrency payments, supported blockchain rails, and verification protocols."
      badge="Payments & Cryptography"
      badgeIcon={CreditCard}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/payment-policy"
      toc={TOC}
    >
      {/* 1. Architecture Overview */}
      <section id="overview" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Payment Architecture Overview
        </h2>
        <p>
          DocuNexa provides an international software productivity platform. To ensure borderless access for users worldwide
          without requiring traditional credit cards, domestic bank accounts, or restrictive fiat gateways, DocuNexa supports
          direct, peer-to-peer stablecoin cryptocurrency payments.
        </p>
        <p>
          Our payment system is built on automated server-to-server transaction monitoring, transparent pricing,
          and robust mathematical collision-prevention algorithms.
        </p>
      </section>

      {/* 2. Product Pricing & Coupons */}
      <section id="pricing-model" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. Product Pricing &amp; Promotional Coupon Discounts
        </h2>
        <p>
          DocuNexa features a single, straightforward paid tier:
        </p>
        <div className="p-5 rounded-md bg-surface border border-border space-y-3 text-xs sm:text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-border">
            <div>
              <span className="block font-bold text-ink text-base">Ad-Free Upgrade</span>
              <span className="text-muted">One-time account upgrade (Permanent)</span>
            </div>
            <div className="text-right">
              <span className="text-xl font-extrabold text-brand">$2.00 USD</span>
              <span className="block text-[10px] text-muted">Fixed rate in USDT</span>
            </div>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-muted">
            <li><strong>No Subscription:</strong> This is a one-time charge. There are no recurring monthly, quarterly, or annual renewal fees.</li>
            <li><strong>Promotional Coupons:</strong> Legitimate coupon codes may apply percentage discounts (e.g. 25% discount yields $1.50) or fixed USDT discounts. Discounts are strictly validated server-side.</li>
            <li><strong>Scope of Upgrade:</strong> Ad-Free permanently removes third-party Monetag advertising banners, interstitial scripts, and sponsor blocks across all 34 tools for your account.</li>
          </ul>
        </div>
      </section>

      {/* 3. Active Methods */}
      <section id="active-methods" className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. Currently Active Payment Rails
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          The following two cryptocurrency payment options are verified, operational, and active for checkout:
        </p>

        {/* 3.1 Polygon USDT */}
        <div id="polygon-usdt" className="p-6 rounded-md bg-surface border border-border space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              3.1 USDT on Polygon (PoS)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
              Active Rail
            </span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-muted">
            <li><strong>Token:</strong> Tether USD (USDT).</li>
            <li><strong>Network:</strong> Polygon (PoS) network. (Do NOT send on Ethereum Mainnet, BSC, or Arbitrum).</li>
            <li><strong>Token Contract:</strong> <code>0xc2132D05D31c914a87C6611C10748AEb04B58e8F</code> (Decimals: 6).</li>
            <li><strong>Deposit Address:</strong> Configured dynamically per checkout from verified institutional deposit address.</li>
            <li><strong>Verification Mechanism:</strong> Queried server-to-server via Bybit V5 read-only asset deposit API.</li>
          </ul>
        </div>

        {/* 3.2 Aptos USDT */}
        <div id="aptos-usdt" className="p-6 rounded-md bg-surface border border-border space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              3.2 USDT on Aptos Mainnet (Tether Fungible Asset)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 font-bold text-[10px] border border-emerald-200 dark:border-emerald-800">
              Active Rail
            </span>
          </div>
          <ul className="list-disc pl-5 space-y-1.5 text-muted">
            <li><strong>Token:</strong> Official Tether USDt on Aptos (Fungible Asset Standard).</li>
            <li><strong>Network:</strong> Aptos Mainnet.</li>
            <li><strong>Official Asset Metadata:</strong> <code>{OFFICIAL_CONTRACTS.APTOS_USDT_METADATA}</code> (Decimals: 6).</li>
            <li><strong>Receiving Address:</strong> Configured 64-character Aptos hex address in server environment.</li>
            <li><strong>Verification Mechanism:</strong> Monitored directly using Aptos Mainnet GraphQL Indexer and fullnode REST API.</li>
          </ul>
        </div>
      </section>

      {/* 4. Planned Methods (Disabled) */}
      <section id="planned-methods" className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Planned International Payment Rails (Currently Disabled)
        </h2>
        <div className="p-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <AlertCircle size={15} />
            Mandatory Disclosure: Planned Rails Are NOT Active
          </p>
          <p>
            The following payment methods are in technical architecture review. They are <strong>STRICTLY DISABLED</strong> in
            production checkout and cannot be used to pay for upgrades at this time. Never attempt to send funds to unannounced addresses.
          </p>
        </div>

        {/* 4.1 TRON USDT */}
        <div id="tron-usdt" className="p-6 rounded-md bg-surface border border-dashed border-border space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              4.1 Planned: USDT on TRON (TRC20)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-paper text-muted font-bold text-[10px] border border-border">
              Planned / Disabled
            </span>
          </div>
          <p className="text-muted">
            TRC20 USDT is a popular international stablecoin transfer format. When activated, it will conform to:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li><strong>Token:</strong> Tether USD (TRC20).</li>
            <li><strong>Network:</strong> TRON Mainnet.</li>
            <li><strong>Official Smart Contract:</strong> <code>{OFFICIAL_CONTRACTS.TRON_USDT_TRC20}</code> (Decimals: 6).</li>
            <li><strong>Address Format:</strong> Base58 starting with &apos;T&apos; (34 characters).</li>
            <li><strong>Status:</strong> Disabled. Requires finalization of automated TRON node transaction indexer and compliance audit.</li>
          </ul>
        </div>

        {/* 4.2 Native Polygon USDC */}
        <div id="polygon-usdc" className="p-6 rounded-md bg-surface border border-dashed border-border space-y-3 text-xs sm:text-sm">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-bold text-ink text-base flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
              4.2 Planned: Native USDC on Polygon PoS (Circle Issued)
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-paper text-muted font-bold text-[10px] border border-border">
              Planned / Disabled
            </span>
          </div>
          <p className="text-muted">
            Circle-issued native USD Coin (USDC) on Polygon PoS. Crucial technical distinction:
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li><strong>Accepted Target Contract:</strong> Native USDC <code>{OFFICIAL_CONTRACTS.POLYGON_USDC_NATIVE}</code> (Decimals: 6).</li>
            <li><strong>Incompatible Legacy Bridged Token:</strong> Bridged <code>USDC.e</code> (<code>{OFFICIAL_CONTRACTS.POLYGON_USDC_BRIDGED_LEGACY}</code>) is NOT compatible.</li>
            <li><strong>Status:</strong> Disabled. Requires deployment of native USDC event filter.</li>
          </ul>
        </div>
      </section>

      {/* 5. Exact Amount & Anti-Collision */}
      <section id="exact-amount" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Unique Fractional Amount &amp; Collision Prevention
        </h2>
        <p>
          Because DocuNexa does not require personal identification or KYC documentation, our server generates a unique payment amount
          for every order:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>For example, instead of exactly 2.000000 USDT, an order may request <code>2.004821 USDT</code>.</li>
          <li>The pseudo-random fractional micro-units act as a cryptographically unique order matching key on the public blockchain.</li>
          <li><strong>Requirement:</strong> You must transfer the <strong>EXACT</strong> displayed amount. Altering the amount will prevent automatic crediting.</li>
        </ul>
      </section>

      {/* 6. Window Expiration */}
      <section id="window-expiration" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. The 20-Minute Window &amp; Block Confirmations
        </h2>
        <p>
          Each order and unique amount reservation remains valid for exactly <strong>20 minutes</strong> from creation.
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Timely Broadcast:</strong> Ensure your wallet or exchange broadcasts the transaction within this window.</li>
          <li><strong>Confirmations:</strong> Polygon PoS deposits require standard network block confirmations before Bybit releases the deposit state. Aptos transactions finalize within sub-second consensus.</li>
        </ul>
      </section>

      {/* 7. Server-to-Server Verification */}
      <section id="verification-process" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. Server-to-Server Verification (No Screenshots)
        </h2>
        <div className="p-4 rounded-md bg-slate-100 dark:bg-ink/40 border border-border text-xs sm:text-sm text-ink space-y-2">
          <p className="font-bold text-ink">
            Cryptographic On-Chain Verification Standard:
          </p>
          <p>
            DocuNexa activates orders exclusively upon verified cryptographic confirmation on the destination blockchain.
            <strong> User-submitted transaction screenshots, receipts, or PDF confirmations are never accepted as proof of payment.</strong>
          </p>
        </div>
      </section>

      {/* 8. Gas Fees & Exchange Deductions */}
      <section id="transaction-fees" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          8. Network Gas Fees &amp; Exchange Withdrawal Deductions
        </h2>
        <p>
          When transferring funds from centralized exchanges (such as Binance, OKX, Bybit, Coinbase, or Kraken):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Exchanges often deduct a flat withdrawal fee (e.g. 0.50 USDT or 1.00 USDT) from the amount you enter.</li>
          <li><strong>You must add the exchange fee to your transfer</strong> so that the destination address receives the exact required order amount.</li>
        </ul>
      </section>

      {/* 9. Dispute & Exception Handling */}
      <section id="payment-exceptions" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          9. Crypto Refunds, Disputes &amp; Exception Handling
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          Cryptocurrency transactions operate on decentralized ledgers (Polygon PoS and Aptos Mainnet). Because on-chain transfers are irreversible once confirmed by network consensus, transaction handling and refund requests strictly reflect the technical reality of blockchain settlements:
        </p>
        <ul className="list-disc pl-5 space-y-2 text-xs sm:text-sm text-muted">
          <li>
            <strong>Irreversibility:</strong> On-chain transfers cannot be canceled, charged back, or reversed by DocuNexa or any payment intermediary.
          </li>
          <li>
            <strong>Server Verification:</strong> Our payment daemon reads deposits directly via Bybit V5 read-only asset deposit queries (for Polygon USDT) and Aptos Mainnet GraphQL indexers. If an order encounters an amount mismatch (due to exchange withdrawal deductions) or arrives after the 20-minute reservation window, automated crediting pauses to prevent collision.
          </li>
          <li>
            <strong>Administrative Manual Review:</strong> We provide manual reconciliation for payment exceptions. When an exception occurs, submit your Order ID and public transaction hash (TxID) to <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a>.
          </li>
          <li>
            <strong>Cryptocurrency Return Constraints:</strong> Where a duplicate payment is verified and an on-chain return is approved under our voluntary policy, the return is broadcast manually to the verified sender address minus third-party network gas fees. Because network transaction fees are paid directly to miners/validators and cannot be recovered, refunds for small micro-unit discrepancies where network gas fees exceed the discrepancy amount are resolved via manual account crediting rather than on-chain return.
          </li>
          <li>
            <strong>Operational Target Response:</strong> Our payment desk aims to review submitted exception tickets within a target window of 24 to 48 business hours on a best-efforts basis. This timeframe is an operational target estimate and not a guaranteed commercial Service Level Agreement (SLA).
          </li>
        </ul>
        <p className="text-xs text-muted">
          For full details on exception handling procedures, see our{' '}
          <Link href="/refund-policy" className="text-brand hover:underline">
            Refund &amp; Cancellation Policy
          </Link>.
        </p>
      </section>

      {/* 10. Compliance Notice */}
      <section id="compliance-notice" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          10. Sanctions &amp; Regulatory Compliance
        </h2>
        <p className="text-xs sm:text-sm text-muted leading-relaxed">
          DocuNexa strictly prohibits the use of its payment infrastructure for illicit activities, money laundering,
          terrorist financing, or transactions originating from sanctioned jurisdictions (including OFAC, EU, and UN designated entities).
        </p>
      </section>

      {/* 11. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          11. Payment Assistance Contact
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          For technical order inquiries or verification assistance, contact our payment operations desk:
        </p>
        <div className="p-4 rounded-md bg-surface border border-border font-mono text-xs text-ink">
          <p><strong>Payment Support:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Subject Tag:</strong> [Crypto Payment Support]</p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

