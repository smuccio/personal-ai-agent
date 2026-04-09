import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Personal AI Agent',
  description: 'Browser automation agent powered by Kernel + LLMs',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-zinc-950 text-white">{children}</body>
    </html>
  );
}
