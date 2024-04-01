'use clients';
import classNames from 'classnames';
import styles from './index.module.css';
import type { FC, InputHTMLAttributes } from 'react';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  inline?: boolean;
};

const Input: FC<InputProps> = ({ label, inline, type, ...inputProps }) => {
  const isCheckbox = type === 'checkbox';

  return (
    <div
      className={classNames(styles.inputWrapper, {
        [styles.inline]: inline,
        [styles.checkbox]: isCheckbox,
      })}
    >
      {label && <label className={styles.label}>{label}</label>}
      <input className={styles.input} type={type} {...inputProps} />
    </div>
  );
};

export default Input;
