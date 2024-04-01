import * as RadixAvatar from '@radix-ui/react-avatar';
import styles from './index.module.css';
import type { FC } from 'react';

type AvatarProps = {
  src: string;
  alt: string;
};

const Avatar: FC<AvatarProps> = ({ src, alt }) => (
  <RadixAvatar.Root>
    <RadixAvatar.Image
      loading="lazy"
      src={src}
      alt={alt}
      className={styles.avatar}
    />
    <RadixAvatar.Fallback delayMs={500} className={styles.avatar}>
      {alt}
    </RadixAvatar.Fallback>
  </RadixAvatar.Root>
);

export default Avatar;
