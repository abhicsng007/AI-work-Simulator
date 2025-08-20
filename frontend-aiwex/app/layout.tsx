import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Work Simulator',
  description: 'Collaborate with AI agents in a simulated work environment',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[--color-discord-light] text-[--color-discord-text]`}>
        {children}
      </body>
    </html>
  );
}