import type { Metadata, Viewport } from 'next';
import { TelegramAppClient } from './TelegramAppClient';

export const metadata: Metadata = {
  title: 'DocuNexa Mini App — PDF Tools, Unit Cutter & Support',
  description:
    'Split textbooks into units, merge, compress, convert PDFs, and contact human support right inside Telegram or browser.',
  alternates: {
    canonical: 'https://docunexa.pro.et/telegram-app',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function TelegramMiniAppPage() {
  return <TelegramAppClient />;
}
