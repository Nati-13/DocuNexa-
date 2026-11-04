import nodemailer, { type Transporter } from 'nodemailer';

/**
 * Email dispatcher for DocuNexa.
 * Delivers six-character password recovery codes using dedicated Gmail SMTP.
 */

export interface SendResetEmailParams {
  to: string;
  code: string;
  transporter?: Transporter;
}

export interface SendWelcomeEmailParams {
  to: string;
  transporter?: Transporter;
  requestId?: string;
}

/**
 * Returns true if the required server-side SMTP credentials are configured.
 */
export function isSmtpConfigured(): boolean {
  // Real SMTP delivery is allowed ONLY in actual Vercel Production deployments.
  // Preview, local development, and unknown environments must fail closed.
  if (process.env.VERCEL_ENV !== 'production') {
    return false;
  }
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  return Boolean(user && pass);
}

/**
 * Helper to retrieve server-side SMTP configuration safely.
 */
export function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim() || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT?.trim() || '465', 10);
  const secureEnv = process.env.SMTP_SECURE?.trim();
  const secure = secureEnv !== undefined ? secureEnv.toLowerCase() === 'true' || secureEnv === '1' : port === 465;
  const user = process.env.SMTP_USER?.trim() || '';
  // Gmail app passwords can include spaces (e.g. "hvez mpse tesq szrm"); strip whitespace for reliable SMTP auth
  const pass = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';
  const from = process.env.EMAIL_FROM?.trim() || (user ? `DocuNexa Security <${user}>` : 'DocuNexa Security <docunexa.security@gmail.com>');

  return { host, port, secure, user, pass, from };
}

/**
 * Sends a six-character password reset code via Gmail SMTP.
 */
export async function sendPasswordResetEmail({
  to,
  code,
  transporter: customTransporter,
}: SendResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const subject = 'Your DocuNexa Password Reset Code';
  const textContent = `Your DocuNexa password reset code is:

${code}

This code expires in 10 minutes.

If you did not request a password reset, you can safely ignore this email.`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 16px;">
      <div style="margin-bottom: 20px;">
        <h2 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">DocuNexa Password Recovery</h2>
      </div>
      <p style="font-size: 14px; line-height: 1.5; color: #475569; margin: 0 0 16px;">
        We received a request to reset your password. Use the verification code below to complete your password reset:
      </p>
      <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 12px; padding: 16px; text-align: center; margin: 20px 0;">
        <span style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 28px; font-weight: 800; letter-spacing: 4px; color: #4338ca;">
          ${code}
        </span>
      </div>
      <p style="font-size: 13px; color: #64748b; margin: 16px 0 8px;">
        This code expires in <strong>10 minutes</strong> and can only be used once.
      </p>
      <p style="font-size: 12px; color: #94a3b8; margin: 16px 0 0; border-top: 1px solid #f1f5f9; pt-3;">
        If you did not request a password reset, you can safely ignore this email.
      </p>
    </div>
  `;

  // If a mock or custom transporter was explicitly provided (e.g. in test suites), use it directly
  if (customTransporter) {
    try {
      const { from } = getSmtpConfig();
      await customTransporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true };
    } catch (err: any) {
      return handleSmtpError(err);
    }
  }

  // 1. Guard against sending real SMTP emails in Vercel Preview deployments
  if (process.env.VERCEL_ENV === 'preview') {
    return {
      success: false,
      error: 'Password reset email delivery is disabled in preview deployments.',
    };
  }

  // 2. In unit test environments without mock transporter, simulate successful delivery without real SMTP
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_SMTP_TEST) {
    return { success: true };
  }

  // 3. Real SMTP delivery is permitted ONLY on Vercel Production deployments
  if (process.env.VERCEL_ENV !== 'production') {
    return {
      success: false,
      error: 'Real SMTP email delivery is permitted only on Vercel Production deployments.',
    };
  }

  // 4. Check if SMTP credentials are configured
  if (!isSmtpConfigured()) {
    return {
      success: false,
      error: 'Password reset email service is currently not configured or unavailable.',
    };
  }

  try {
    const { host, port, secure, user, pass, from } = getSmtpConfig();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: any) {
    return handleSmtpError(err);
  }
}

/**
 * Sends an automated customer welcome email upon successful account registration.
 * Non-critical notification: failure to deliver does not undo account registration.
 */
export async function sendWelcomeEmail({
  to,
  transporter: customTransporter,
  requestId,
}: SendWelcomeEmailParams): Promise<{ success: boolean; error?: string }> {
  const subject = 'Welcome to DocuNexa — Free Client-Side PDF Tools';

  const textContent = `Welcome to DocuNexa!

Thank you for registering with DocuNexa (https://docunexa.pro.et).

DocuNexa provides fast, private, browser-based PDF utilities engineered for zero-upload document privacy. All PDF operations — including our flagship PDF Unit Cutter, page merging, splitting, OCR text extraction, watermarking, and document protection — execute directly inside your browser without dispatching document files to external servers.

Explore all available tools:
https://docunexa.pro.et/tools

Home:
https://docunexa.pro.et

Legal & Privacy Policies:
- Terms of Service: https://docunexa.pro.et/terms-of-service
- Privacy Policy: https://docunexa.pro.et/privacy-policy

Need support or have questions? Contact us anytime at:
docunexa.security@gmail.com

Best regards,
The DocuNexa Team
https://docunexa.pro.et`;

  const htmlContent = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #1e293b; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 20px;">
      <div style="margin-bottom: 24px; text-align: center;">
        <span style="display: inline-block; padding: 6px 14px; background: #eef2ff; color: #4338ca; border-radius: 9999px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px;">
          DocuNexa
        </span>
        <h1 style="margin: 16px 0 8px; color: #0f172a; font-size: 22px; font-weight: 800; line-height: 1.3;">
          Welcome to DocuNexa
        </h1>
        <p style="margin: 0; font-size: 14px; color: #64748b;">
          Your private in-browser PDF tools platform
        </p>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 16px;">
        Thank you for registering with DocuNexa. Your account is active and ready to use.
      </p>

      <p style="font-size: 14px; line-height: 1.6; color: #334155; margin: 0 0 20px;">
        DocuNexa is designed with strict client-side data privacy: all standard document processing — including page splitting, merging, conversion, optical character recognition (OCR), and our flagship <strong>PDF Unit Cutter</strong> — executes entirely inside your web browser. Your sensitive documents are never uploaded to remote cloud storage.
      </p>

      <div style="text-align: center; margin: 28px 0;">
        <a href="https://docunexa.pro.et/tools" style="display: inline-block; background: #4338ca; color: #ffffff; text-decoration: none; padding: 12px 28px; font-size: 13px; font-weight: 700; border-radius: 12px; box-shadow: 0 2px 4px rgba(67, 56, 202, 0.2);">
          Explore All PDF Tools &rarr;
        </a>
      </div>

      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; padding: 18px; margin-bottom: 24px;">
        <p style="margin: 0 0 10px; font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">
          Key Platform Capabilities
        </p>
        <ul style="margin: 0; padding-left: 20px; font-size: 13px; line-height: 1.6; color: #475569;">
          <li><strong>PDF Unit Cutter:</strong> Intelligent semantic textbook splitting with automated table-of-contents detection.</li>
          <li><strong>Client-Side Security:</strong> Zero-upload file processing keeping your confidential records on your machine.</li>
          <li><strong>Comprehensive Suite:</strong> Merge, compress, protect, watermark, reorder, and convert PDFs seamlessly.</li>
        </ul>
      </div>

      <div style="border-top: 1px solid #f1f5f9; padding-top: 20px; margin-top: 24px; font-size: 12px; line-height: 1.6; color: #64748b;">
        <p style="margin: 0 0 8px;">
          Website: <a href="https://docunexa.pro.et" style="color: #4338ca; text-decoration: underline;">https://docunexa.pro.et</a>
        </p>
        <p style="margin: 0 0 8px;">
          Legal & Privacy Policies:
          <a href="https://docunexa.pro.et/terms-of-service" style="color: #4338ca; text-decoration: underline;">Terms of Service</a> &bull;
          <a href="https://docunexa.pro.et/privacy-policy" style="color: #4338ca; text-decoration: underline;">Privacy Policy</a>
        </p>
        <p style="margin: 0 0 8px;">
          Need assistance or have feedback? Contact us at <a href="mailto:docunexa.security@gmail.com" style="color: #4338ca; text-decoration: underline;">docunexa.security@gmail.com</a>.
        </p>
        <p style="margin: 16px 0 0; font-size: 11px; color: #94a3b8; border-top: 1px solid #f8fafc; padding-top: 12px;">
          You received this email because an account was registered with DocuNexa using this email address.
        </p>
      </div>
    </div>
  `;

  // Custom mock transporter for testing
  if (customTransporter) {
    try {
      const { from } = getSmtpConfig();
      await customTransporter.sendMail({
        from,
        to,
        subject,
        text: textContent,
        html: htmlContent,
      });
      return { success: true };
    } catch (err: any) {
      return handleSmtpError(err);
    }
  }

  // 1. Guard against sending real SMTP emails in Vercel Preview deployments
  if (process.env.VERCEL_ENV === 'preview') {
    return {
      success: false,
      error: 'Welcome email delivery is disabled in preview deployments.',
    };
  }

  // 2. In unit test environments without mock transporter, simulate successful delivery without real SMTP
  if (process.env.NODE_ENV === 'test' && !process.env.FORCE_SMTP_TEST) {
    return { success: true };
  }

  // 3. Real SMTP delivery is permitted ONLY on Vercel Production deployments
  if (process.env.VERCEL_ENV !== 'production') {
    return {
      success: false,
      error: 'Real SMTP email delivery is permitted only on Vercel Production deployments.',
    };
  }

  // 4. Check if SMTP credentials are configured
  if (!isSmtpConfigured()) {
    return {
      success: false,
      error: 'SMTP service is currently not configured or unavailable.',
    };
  }

  try {
    const { host, port, secure, user, pass, from } = getSmtpConfig();

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {
        user,
        pass,
      },
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });

    await transporter.sendMail({
      from,
      to,
      subject,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (err: any) {
    return handleSmtpError(err);
  }
}

/**
 * Handles SMTP delivery errors safely without logging sensitive passwords, codes, or private account details.
 */
function handleSmtpError(err: any): { success: boolean; error: string } {
  const errCode = (err?.code || '').toString().toUpperCase();
  const responseCode = err?.responseCode;
  const msg = (err?.message || '').toLowerCase();

  let safeMessage = 'Failed to deliver recovery email.';

  if (
    errCode === 'EAUTH' ||
    responseCode === 535 ||
    msg.includes('invalid login') ||
    msg.includes('badcredentials') ||
    msg.includes('username and password not accepted')
  ) {
    console.error('[SMTP Provider Diagnostic] code=AUTH_FAILED, reason=SMTP authentication rejected');
    safeMessage = 'Email service authentication failed.';
  } else if (
    ['ECONNECTION', 'ETIMEDOUT', 'ENOTFOUND', 'ECONNREFUSED', 'ESOCKET'].includes(errCode) ||
    msg.includes('timeout') ||
    msg.includes('connect')
  ) {
    console.error(`[SMTP Provider Diagnostic] code=${errCode || 'NETWORK_ERROR'}, reason=Connection failure`);
    safeMessage = 'Network error communicating with email service.';
  } else if (
    responseCode === 550 ||
    responseCode === 553 ||
    responseCode === 554 ||
    msg.includes('rejected') ||
    msg.includes('mailbox unavailable')
  ) {
    console.error(`[SMTP Provider Diagnostic] code=DELIVERY_REJECTED, status=${responseCode || 'REJECTED'}`);
    safeMessage = 'Recipient or message delivery was rejected by the mail server.';
  } else {
    console.error(`[SMTP Provider Diagnostic] code=${errCode || 'DELIVERY_ERROR'}, status=${responseCode || 'ERROR'}`);
    safeMessage = 'Failed to deliver recovery email.';
  }

  return { success: false, error: safeMessage };
}
