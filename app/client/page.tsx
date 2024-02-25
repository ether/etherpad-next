'use client';

import { useEffect } from 'react';
import io from 'socket.io-client';
const Page = () => {
  useEffect(() => {
    const socket = io();
    socket.on('connect', () => {
      console.log('connected');
      socket.emit('input-change', 'Hello World!');
      console.log('connected');
    });

    socket.on('welcome', (data: any) => {
      console.log(data);
    });

    socket.on('disconnect', () => {
      console.log('disconnected');
    });
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h1>Page</h1>
    </div>
  );
};

export default Page;
