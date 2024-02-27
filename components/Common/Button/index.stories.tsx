import { Heart } from 'lucide-react';
import Button from './';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Button>;
type Meta = MetaObj<typeof Button>;

const defaultStory: Story = {
  args: {
    children: (
      <>
        <Heart className="size-6" /> We love Etherpad
      </>
    ),
    // it's allow to have button on the storybook layout to toggle the disabled state
    disabled: false,
    autoFocus: false,
  },
};

export const Solid: Story = {
  args: {
    ...defaultStory.args,
    variant: 'solid',
  },
};

export const Outline: Story = {
  args: {
    ...defaultStory.args,
    variant: 'outline',
  },
};

export const Gradient: Story = {
  args: {
    ...defaultStory.args,
    variant: 'gradient',
  },
};

export default { component: Button } as Meta;
