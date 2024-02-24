import Input from '.';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Input>;
type Meta = MetaObj<typeof Input>;

export const Default: Story = {
  args: {
    label: 'Enter Text',
    placeholder: 'Type here...',
  },
};

export const WithoutLabel: Story = {
  args: {
    placeholder: 'Type here...',
  },
};

export const Inline: Story = {
  args: {
    label: 'Inline Text Input',
    inline: true,
  },
};

export const Checkbox: Story = {
  args: {
    label: 'Checkbox',
    type: 'checkbox',
  },
};

export default { component: Input } as Meta;
