import classNames from 'classnames';
import styles from './index.module.css';
import type { FC, PropsWithChildren } from 'react';

type MessageProps = {
  variant?: 'sended' | 'received';
  haveMessageTop?: boolean;
  haveMessageBottom?: boolean;
};

const Message: FC<PropsWithChildren<MessageProps>> = ({
  variant = 'sended',
  haveMessageTop = false,
  haveMessageBottom = false,
  children,
}) => {
  return (
    <div
      className={classNames(styles.message, styles[variant], {
        [styles.haveMessageTop]: haveMessageTop,
        [styles.haveMessageBottom]: haveMessageBottom,
      })}
    >
      {children}
    </div>
  );
};

export default Message;
