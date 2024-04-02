import Editor from '.';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Editor>;
type Meta = MetaObj<typeof Editor>;

export const Default: Story = {
  render: () => <Editor />

};

export default { component: Editor } as Meta;
