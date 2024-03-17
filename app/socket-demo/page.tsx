// @TODO: remove this is for development only to test the websocket
'use client';
import { useWebSocket } from 'next-ws/client';
import { useCallback, useEffect, useState } from 'react';
import Button from '@/components/Common/Button';
import Input from '@/components/Common/Input';

export default function Page() {
  const ws = useWebSocket();
  const [value, setValue] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  const onMessage = useCallback(
    (event: MessageEvent<Blob>) => void event.data.text().then(setMessage),
    []
  );

  useEffect(() => {
    console.log('ws', ws);
    ws?.addEventListener('message', onMessage);
    return () => ws?.removeEventListener('message', onMessage);
  }, [onMessage, ws]);

  return (
    <>
      <Input
        type="text"
        value={value}
        onChange={event => setValue(event.target.value)}
      />

      <Button onClick={() => ws?.send(value)}>Send message to server</Button>

      <p>Message from server: {message}</p>
    </>
  );
}
