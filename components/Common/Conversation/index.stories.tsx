import Conversation from '.';
import type { Meta as MetaObj, StoryObj } from '@storybook/react';

type Story = StoryObj<typeof Conversation>;
type Meta = MetaObj<typeof Conversation>;

export const Default: Story = {
  args: {
    messages: [
      {
        content: 'Hello, how are you?',
        sender: 'John Doe',
      },
      {
        content: 'I am fine, thank you!',
        sender: 'Jane Doe',
      },
      {
        content: 'What are you doing?',
        sender: 'John Doe',
      },
      {
        content: 'I am working on a new project',
        sender: 'Jane Doe',
      },
      {
        content: 'That is great!',
        sender: 'Jane Doe',
      },
      {
        content: 'Yes, I am very excited!',
        sender: 'John Doe',
      },
    ],
  },
};

export default { component: Conversation } as Meta;
