import Avatar from './';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Avatar>;
type Meta = MetaObj<typeof Avatar>;

export const Default: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/AugustinMauroy',
    alt: 'AugustinMauroy',
  },
};

export const FallBack: Story = {
  args: {
    src: 'https://avatars.githubusercontent.com/u/',
    alt: 'UA',
  },
};

export default { component: Avatar } as Meta;
