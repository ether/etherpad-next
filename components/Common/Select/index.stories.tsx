import Select from '.';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Select>;
type Meta = MetaObj<typeof Select>;

export const Default: Story = {
  args: {
    values: ['option 1', 'option 2', 'option 3', 'option 4', 'option 5'],
    defaultValue: 'option 1',
    label: 'Select an option',
  },
};

export const WithoutLabel: Story = {
  args: {
    values: ['option 1', 'option 2', 'option 3', 'option 4', 'option 5'],
    defaultValue: 'option 1',
  },
};

export default { component: Select } as Meta;
