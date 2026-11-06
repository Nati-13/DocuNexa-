import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import { LegalPageLayout } from '@/components/legal/LegalPageLayout';
import { RotateCcw, AlertCircle, CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Refund & Cancellation Policy — DocuNexa',
  description:
    'Clear consumer policy regarding free tools, the $2 Ad-Free one-time upgrade, cryptocurrency payment exceptions, and refund resolution procedures.',
  alternates: {
    canonical: 'https://docunexa.pro.et/refund-policy',
  },
};

const TOC = [
  { id: 'overview', title: '1. Policy Scope & Core Principles' },
  { id: 'free-services', title: '2. Free Platform Services' },
  { id: 'one-time-nature', title: '3. One-Time Payment Structure (No Recurring Fees)' },
  { id: 'crypto-nature', title: '4. Cryptocurrency Transaction Finality' },
  { id: 'payment-exceptions', title: '5. Specific Payment Exceptions & Resolutions' },
  { id: 'duplicate-payments', title: '5.1 Duplicate Transactions' },
  { id: 'amount-mismatch', title: '5.2 Amount Discrepancies (Over/Underpayment)' },
  { id: 'late-payments', title: '5.3 Late Transactions (Post 20-Minute Window)' },
  { id: 'unsupported-networks', title: '5.4 Unsupported Network Transfers' },
  { id: 'technical-failure', title: '5.5 Technical Failure to Credit Entitlement' },
  { id: 'consumer-rights', title: '6. International Statutory Consumer Rights vs. Voluntary Policy' },
  { id: 'refund-procedure', title: '7. How to Request Payment Review or Refund' },
  { id: 'processing-timelines', title: '8. Target Investigation & Resolution Timelines' },
  { id: 'contact', title: '9. Payment Support Inquiries' },
];

export default function RefundPolicyPage() {
  const lastUpdated = 'November 1, 2026';
  const version = '2026.11';

  return (
    <LegalPageLayout
      title="Refund & Cancellation Policy"
      subtitle="Transparent explanation of our digital payment terms, blockchain settlement finality, exception resolutions, and international consumer rights."
      badge="Consumer Protection"
      badgeIcon={RotateCcw}
      lastUpdated={lastUpdated}
      version={version}
      canonicalPath="/refund-policy"
      toc={TOC}
    >
      {/* 1. Policy Scope & Core Principles */}
      <section id="overview" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          1. Policy Scope & Core Principles
        </h2>
        <p>
          DocuNexa is committed to transparent, fair, and legally compliant payment operations for our international customer base.
          This Refund &amp; Cancellation Policy governs all purchases made through{' '}
          <a href="https://docunexa.pro.et" className="text-brand hover:underline">
            https://docunexa.pro.et
          </a>.
        </p>
        <p>
          We reject deceptive automatic recurring billing and predatory subscription renewals. We operate with clear pricing,
          straightforward digital deliverability, and responsive support for transaction exceptions.
        </p>
      </section>

      {/* 2. Free Platform Services */}
      <section id="free-services" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          2. Free Platform Services
        </h2>
        <p>
          All 34 standard document tools on DocuNexa (including PDF Unit Cutter, Merge, Split, Compress, Convert, Edit, and Security utilities)
          are completely free to use. Users can process documents, download converted files, and explore capabilities without paying any fees,
          submitting credit cards, or registering accounts.
        </p>
      </section>

      {/* 3. One-Time Payment Structure */}
      <section id="one-time-nature" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          3. One-Time Payment Structure (No Recurring Subscriptions)
        </h2>
        <div className="p-4 rounded-md bg-brand-50/60 dark:bg-brand-950/40 border border-brand-200 dark:border-brand-800/60 text-xs sm:text-sm text-ink space-y-2">
          <p className="font-bold text-brand-800 dark:text-brand-300">
            Zero Surprise Recurring Charges:
          </p>
          <p>
            The DocuNexa <strong>Ad-Free upgrade ($2.00 USD)</strong> is a single, one-time payment.
            It is <strong>NOT</strong> an automatically renewing monthly or annual subscription. You will never be billed again unexpectedly.
          </p>
        </div>
      </section>

      {/* 4. Cryptocurrency Transaction Finality */}
      <section id="crypto-nature" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          4. Cryptocurrency Transaction Finality
        </h2>
        <p>
          DocuNexa utilizes decentralized blockchain networks (Polygon PoS and Aptos Mainnet) for stablecoin payments (USDT).
          By nature of public distributed ledger protocols:
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li>Confirmed on-chain cryptocurrency transactions are permanent, immutable, and technically irreversible by any third party.</li>
          <li>DocuNexa does not operate automatic refund smart contracts or reverse transaction bots.</li>
          <li>All valid refund or payment exception resolutions are handled through administrative review by our support team.</li>
        </ul>
      </section>

      {/* 5. Specific Payment Exceptions & Resolutions */}
      <section id="payment-exceptions" className="space-y-6">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          5. Specific Payment Exceptions &amp; Resolutions
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          Due to network latency, gas fee miscalculations, or user error, cryptocurrency payments may occasionally encounter discrepancies.
          Here is how DocuNexa handles each specific scenario:
        </p>

        {/* 5.1 Duplicate Payments */}
        <div id="duplicate-payments" className="p-5 rounded-md bg-surface border border-border space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-ink text-base">
            5.1 Duplicate Transactions for the Same Order
          </h3>
          <p className="text-muted">
            If you accidentally send multiple deposits for a single order, our automated system activates your Ad-Free upgrade on the first confirmed transfer.
          </p>
          <p className="text-muted">
            <strong>Resolution:</strong> Contact support at{' '}
            <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline font-semibold">
              docunexa.security@gmail.com
            </a>{' '}
            with your order ID and the transaction hashes of both deposits. After on-chain verification, our team will either (a) apply the duplicate balance toward another designated account, or (b) initiate an on-chain return of the duplicate funds (net of actual network gas fees).
          </p>
        </div>

        {/* 5.2 Amount Discrepancies */}
        <div id="amount-mismatch" className="p-5 rounded-md bg-surface border border-border space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-ink text-base">
            5.2 Amount Discrepancies (Overpayment or Underpayment)
          </h3>
          <p className="text-muted">
            Each DocuNexa order generates an exact fractional amount (e.g. 2.004821 USDT). If an exchange deducts a withdrawal fee and your deposit arrives with even a minor discrepancy, the order enters an <code>amount_mismatch</code> state and does not activate automatically.
          </p>
          <p className="text-muted">
            <strong>Resolution:</strong>
          </p>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li><strong>Underpayment:</strong> You may either transfer the exact remaining difference, or request an order cancellation and manual refund minus network fees.</li>
            <li><strong>Overpayment:</strong> Our team will manually activate your Ad-Free account and credit or return the surplus overage upon request.</li>
          </ul>
        </div>

        {/* 5.3 Late Transactions */}
        <div id="late-payments" className="p-5 rounded-md bg-surface border border-border space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-ink text-base">
            5.3 Late Transactions (Deposits After the 20-Minute Window)
          </h3>
          <p className="text-muted">
            Orders and assigned amounts are reserved for exactly 20 minutes. If network congestion or delayed exchange withdrawals cause your transaction to confirm after 20 minutes, the order is flagged as <code>late_payment</code>.
          </p>
          <p className="text-muted">
            <strong>Resolution:</strong> Your funds are not lost. Contact support with your order ID and transaction hash. Once confirmed on-chain, we will manually link the payment to your account and activate your Ad-Free upgrade immediately.
          </p>
        </div>

        {/* 5.4 Unsupported Networks */}
        <div id="unsupported-networks" className="p-5 rounded-md bg-surface border border-border space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-ink text-base">
            5.4 Transactions Sent via Unsupported Networks or Wrong Tokens
          </h3>
          <p className="text-muted">
            Sending USDT or other tokens over unsupported networks (e.g. sending via TRON, Ethereum, or BSC when Polygon is required, or sending bridged USDC.e instead of native tokens) prevents our deposit checkers from recognizing your transaction.
          </p>
          <p className="text-muted">
            <strong>Limitation:</strong> Incompatible tokens sent to exchange addresses cannot be extracted or recovered by DocuNexa. Customers must double-check network compatibility before initiating transfers.
          </p>
        </div>

        {/* 5.5 Technical Failure */}
        <div id="technical-failure" className="p-5 rounded-md bg-surface border border-border space-y-2 text-xs sm:text-sm">
          <h3 className="font-bold text-ink text-base">
            5.5 Confirmed On-Chain Deposit with Server Crediting Failure
          </h3>
          <p className="text-muted">
            If your transaction is verified on the blockchain with sufficient confirmations but our server fails to update your profile due to a temporary database or network outage:
          </p>
          <p className="text-muted">
            <strong>Resolution:</strong> We guarantee immediate manual resolution. Simply email support or click the &quot;Check Payment Status&quot; button in your account. Your ad-free access will be granted without additional charges.
          </p>
        </div>
      </section>

      {/* 6. International Statutory Consumer Rights vs. Voluntary Policy */}
      <section id="consumer-rights" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          6. International Statutory Consumer Rights vs. Voluntary Policy
        </h2>
        <p>
          Statutory withdrawal and refund rights are not universal; they depend strictly on the consumer protection laws of your applicable local jurisdiction. DocuNexa distinguishes between mandatory statutory consumer rights and our voluntary courtesy refund policy:
        </p>
        <div className="space-y-3">
          <div className="p-4 rounded-md bg-paper border border-border/60 text-xs sm:text-sm space-y-2">
            <h3 className="font-bold text-ink">6.1 Statutory Consumer Rights (Jurisdiction-Dependent)</h3>
            <p className="text-muted">
              Mandatory consumer rights provided by applicable laws cannot be waived or limited by contract:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-muted">
              <li>
                <strong>European Union &amp; UK Consumers:</strong> Under the EU Consumer Rights Directive (2011/83/EU) and UK Consumer Contracts Regulations, statutory withdrawal periods (such as a 14-day cooling-off period) apply to consumer contracts generally, but include specific statutory exceptions for digital services. By requesting immediate activation of the Ad-Free upgrade at checkout, you expressly consent to performance beginning immediately and acknowledge that statutory withdrawal rights cease once digital delivery commences. Any mandatory statutory legal warranties for defective digital service delivery remain fully preserved under local law.
              </li>
              <li>
                <strong>Australian Consumers:</strong> Services come with non-excludable statutory guarantees under the Australian Consumer Law (ACL). In the event of a major service failure that cannot be remedied, you are entitled to statutory remedies under Australian law.
              </li>
              <li>
                <strong>Other Jurisdictions:</strong> Any statutory cancellation or warranty protections under applicable local consumer laws apply according to the provisions of those specific jurisdictions.
              </li>
            </ul>
          </div>

          <div className="p-4 rounded-md bg-paper border border-border/60 text-xs sm:text-sm space-y-2">
            <h3 className="font-bold text-ink">6.2 Voluntary DocuNexa Courtesy Policy</h3>
            <p className="text-muted">
              Separate from mandatory statutory rights, DocuNexa voluntarily assists users with technical payment anomalies (such as duplicate blockchain deposits, underpayments, overpayments, or delayed network confirmations as detailed in Section 5). Because public blockchain transactions incur irreversible network gas fees paid directly to decentralized validators, voluntary cryptocurrency returns are processed on a case-by-case administrative review basis minus actual network gas costs, or resolved through manual account crediting.
            </p>
          </div>
        </div>
      </section>

      {/* 7. How to Request a Refund */}
      <section id="refund-procedure" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          7. How to Submit a Refund or Payment Exception Request
        </h2>
        <p>
          To ensure swift resolution, submit your request by emailing{' '}
          <a href="mailto:docunexa.security@gmail.com" className="text-brand font-semibold hover:underline">
            docunexa.security@gmail.com
          </a>{' '}
          with the subject line: <code>[Payment Review] Order &lt;Your-Order-ID&gt;</code>. Include the following details:
        </p>
        <div className="p-4 rounded-md bg-surface border border-border text-xs font-mono text-ink space-y-1">
          <p>1. Registered DocuNexa Email Address</p>
          <p>2. DocuNexa Order ID (e.g. ord_...)</p>
          <p>3. Target Blockchain Network (Polygon PoS or Aptos)</p>
          <p>4. Public Transaction Hash (TxID) on block explorer</p>
          <p>5. Sender Wallet Address</p>
          <p>6. Brief explanation of the issue (e.g. duplicate payment, fee deduction discrepancy)</p>
        </div>
      </section>

      {/* 8. Target Timelines */}
      <section id="processing-timelines" className="space-y-4">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          8. Target Investigation &amp; Resolution Timelines (Non-SLA Estimates)
        </h2>
        <p className="text-xs sm:text-sm text-muted">
          DocuNexa is operated as an independent software utility. The following intervals represent <strong>operational target estimates</strong> rather than binding contractual Service Level Agreements (SLAs):
        </p>
        <ul className="list-disc pl-5 space-y-1.5 text-xs sm:text-sm text-muted">
          <li><strong>Target Initial Acknowledgment:</strong> Aimed within 24 to 48 business hours of ticket receipt.</li>
          <li><strong>Target Blockchain Verification:</strong> Typically completed within 1 to 3 business days, subject to explorer data availability and network confirmations.</li>
          <li><strong>Manual Account Crediting:</strong> Same day upon successful completion of administrative on-chain verification.</li>
          <li><strong>Approved On-Chain Return Broadcast:</strong> Where an on-chain return is approved under our voluntary policy, the return transaction is targeted for broadcast within 3 to 5 business days to the verified sender address (net of non-refundable third-party blockchain network gas fees).</li>
        </ul>
      </section>

      {/* 9. Contact */}
      <section id="contact" className="space-y-4 pt-4 border-t border-border">
        <h2 className="text-xl sm:text-2xl font-bold text-ink">
          9. Payment Support Inquiries
        </h2>
        <div className="p-5 rounded-md bg-surface border border-border space-y-1.5 text-xs sm:text-sm font-mono text-ink">
          <p><strong>Payment Review Team:</strong> <a href="mailto:docunexa.security@gmail.com" className="text-brand hover:underline">docunexa.security@gmail.com</a></p>
          <p><strong>Telegram Support Bot:</strong> <a href="https://t.me/docunexa_bot" target="_blank" rel="noopener noreferrer" className="text-sky-500 hover:underline">@docunexa_bot</a></p>
          <p><strong>Support Ticket Desk:</strong> <Link href="/support" className="text-brand hover:underline">https://docunexa.pro.et/support</Link></p>
        </div>
      </section>
    </LegalPageLayout>
  );
}

