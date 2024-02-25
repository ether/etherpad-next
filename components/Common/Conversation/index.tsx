import classNames from 'classnames';
import Avatar from '../Avatar';
import Message from '../Message';
import styles from './index.module.css';
import type { FC } from 'react';

// invented types we will need to update it with db schema
type MessageType = {
  content: string;
  sender: string;
};

type ConversationProps = {
  messages: Array<MessageType>;
};

const Conversation: FC<ConversationProps> = ({ messages }) => {
  const isSender = (index: number, sender: string) =>
    messages[index]?.sender === sender;

  return (
    <div className={styles.conversation}>
      {messages.map((message, index) => (
        <span
          key={index}
          className={classNames(styles.message, {
            [styles.messageSender]: isSender(index, 'Jane Doe'),
          })}
        >
          <Avatar
            // @TODO: replace with real avatar
            // and alt will use strings utils to get acronym
            src={`https://ui-avatars.com/api/?name=${message.sender}`}
            alt={message.sender}
          />
          <Message
            variant={isSender(index, 'Jane Doe') ? 'sended' : 'received'}
            haveMessageTop={messages[index - 1]?.sender === message.sender}
            haveMessageBottom={messages[index + 1]?.sender === message.sender}
          >
            {message.content}
          </Message>
        </span>
      ))}
    </div>
  );
};

export default Conversation;
