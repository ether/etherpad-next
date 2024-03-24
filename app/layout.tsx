import getSetting from '@/lib/settings';
import type { FC, PropsWithChildren } from 'react';
import type { Metadata } from 'next';
import '@/styles/globals.css';

const settings = await getSetting();

const metadata: Metadata = {
  manifest: '/manifest.webmanifest',
  description: settings.title,
};

const Layout: FC<PropsWithChildren> = ({ children }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export { metadata };
export default Layout;
