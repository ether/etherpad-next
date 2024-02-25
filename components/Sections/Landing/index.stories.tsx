import Landing from './';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Landing>;
type Meta = MetaObj<typeof Landing>;

export const Default: Story = {};

export default { component: Landing } as Meta;
