'use client';
import { WebSocketProvider } from 'next-ws/client';
import type { FC, PropsWithChildren } from 'react';

const Layout: FC<PropsWithChildren<{}>> = ({ children }) => (
  <WebSocketProvider url="ws://localhost:3000/socket">
    {children}
  </WebSocketProvider>
);

export default Layout;
