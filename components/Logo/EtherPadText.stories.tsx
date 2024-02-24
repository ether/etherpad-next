import EtherPadText from './EtherPadText';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof EtherPadText>;
type Meta = MetaObj<typeof EtherPadText>;

export const Default: Story = {
  args: {
    width: 300,
    height: 300,
  },
};

export default { title: 'Design System', component: EtherPadText } as Meta;
