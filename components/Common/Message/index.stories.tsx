import Message from '.';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Message>;
type Meta = MetaObj<typeof Message>;

export const Sended: Story = {
  args: {
    variant: 'sended',
    haveMessageTop: false,
    haveMessageBottom: false,
    children: 'This is a sent message.',
  },
};

export const Received: Story = {
  args: {
    variant: 'received',
    haveMessageTop: false,
    haveMessageBottom: false,
    children: 'This is a received message.',
  },
};

export const WithMessageTopAndBottom: Story = {
  args: {
    variant: 'sended',
    haveMessageTop: true,
    haveMessageBottom: true,
    children: 'This message has top and bottom styling.',
  },
};

export const ReceivedWithTopStyling: Story = {
  args: {
    variant: 'received',
    haveMessageTop: true,
    haveMessageBottom: false,
    children: 'This received message has top styling.',
  },
};

export const ReceivedWithBottomStyling: Story = {
  args: {
    variant: 'received',
    haveMessageTop: false,
    haveMessageBottom: true,
    children: 'This received message has bottom styling.',
  },
};

export default { component: Message } as Meta;
