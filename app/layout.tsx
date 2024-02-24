import type { FC, PropsWithChildren } from 'react';
import '@/styles/globals.css';

const Layout: FC<PropsWithChildren> = ({ children }) => (
  <html lang="en">
    <body>{children}</body>
  </html>
);

export default Layout;
