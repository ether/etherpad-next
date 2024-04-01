import { BellDotIcon } from 'lucide-react';
import Notification from '.';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Notification>;
type Meta = MetaObj<typeof Notification>;

export const Default: Story = {
  args: {
    open: true,
    duration: 5000,
    children: 'OK, everything is fine!',
  },
};

export const TimedNotification: Story = {
  args: {
    duration: 5000,
    children: 'OK, everything is fine!',
  },
};

export const WithJSX: Story = {
  args: {
    open: true,
    children: (
      <>
        <BellDotIcon />
        OK, everything is fine!
      </>
    ),
  },
};

export const Success: Story = {
  args: {
    open: true,
    variant: 'success',
    children: 'OK, everything is fine!',
  },
};

export const Error: Story = {
  args: {
    open: true,
    variant: 'error',
    children: 'Something went wrong!',
  },
};

export const Warning: Story = {
  args: {
    open: true,
    variant: 'warning',
    children: 'Be careful!',
  },
};

export default { component: Notification } as Meta;
