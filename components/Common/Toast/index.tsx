import * as ToastPrimitive from '@radix-ui/react-toast';
import classNames from 'classnames';
import styles from './index.module.css';
import type { FC, PropsWithChildren } from 'react';

type ToastProps = PropsWithChildren<{
  variant?: 'success' | 'error' | 'warning' | 'info';
  open?: boolean;
  duration?: number;
  onChange?: (value: boolean) => void;
  className?: string;
}>;

const Toast: FC<ToastProps> = ({
  variant = 'info',
  open,
  // 2s duration
  duration = 2000,
  onChange,
  children,
  className,
}) => (
  <ToastPrimitive.Root
    open={open}
    duration={duration}
    onOpenChange={onChange}
    className={classNames(styles.root, styles[variant], className)}
  >
    <ToastPrimitive.Title className={styles.message}>
      {children}
    </ToastPrimitive.Title>
  </ToastPrimitive.Root>
);

export default Toast;
