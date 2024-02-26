'use client';
import * as ToastPrimitive from '@radix-ui/react-toast';
import { createContext, useState } from 'react';
import Toast from '@/components/Common/Toast';
import type {
  Dispatch,
  FC,
  PropsWithChildren,
  ReactNode,
  SetStateAction,
} from 'react';

type ToastContextType = {
  variant?: 'success' | 'error' | 'warning' | 'info';
  message: string | ReactNode;
  duration?: number;
} | null;

type ToastProps = {
  viewportClassName?: string;
} & ToastPrimitive.ToastProviderProps;

const ToastContext = createContext<ToastContextType>(null);

export const ToastDispatch = createContext<
  Dispatch<SetStateAction<ToastContextType>>
>(() => {});

export const ToastProvider: FC<PropsWithChildren<ToastProps>> = ({
  viewportClassName,
  children,
  ...props
}) => {
  const [notification, dispatch] = useState<ToastContextType>(null);

  return (
    <ToastContext.Provider value={notification} {...props}>
      <ToastDispatch.Provider value={dispatch}>
        <ToastPrimitive.Provider>
          {children}
          <ToastPrimitive.Viewport className={viewportClassName} />
          {notification && (
            <Toast
              duration={notification.duration}
              variant={notification.variant}
            >
              {notification.message}
            </Toast>
          )}
        </ToastPrimitive.Provider>
      </ToastDispatch.Provider>
    </ToastContext.Provider>
  );
};
