import classNames from 'classnames';
import styles from './index.module.css';
import type { FC, ButtonHTMLAttributes } from 'react';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'solid' | 'outline' | 'gradient';
};

const Button: FC<ButtonProps> = ({
  variant = 'solid',
  children,
  className,
  ...props
}) => (
  <button
    className={classNames(styles.button, styles[variant], className)}
    {...props}
  >
    {children}
  </button>
);

export default Button;
