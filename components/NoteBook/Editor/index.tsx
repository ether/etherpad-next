'use client'

import * as Y from 'yjs'
import { QuillBinding } from 'y-quill'
import { WebsocketProvider } from 'y-websocket'
import { FC } from 'react'
import React, { useState, useRef, useEffect } from 'react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const Editor: FC = () => {
  const editorRef = useRef<ReactQuill>(null);

  // A Yjs document holds the shared data
  const ydoc = new Y.Doc()
  // Define a shared text type on the document
  const ytext = ydoc.getText('quill')


  useEffect(() => {
    if(editorRef.current) {
      const provider = new WebsocketProvider(
        'ws://localhost:3002', 'quill-demo-room2', ydoc
      )
      provider.on('status', event => {
        console.log(event.status) // logs "connected" or "disconnected"
      })
      const binding = new QuillBinding(ytext, editorRef.current.getEditor(), provider.awareness)

      return () => {
        binding?.destroy?.();
      };
    }
  }, [ytext])

  return <ReactQuill theme="snow" ref={editorRef}/>;
  
}

export default Editor;