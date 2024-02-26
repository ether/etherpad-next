import type { Meta as MetaObj, StoryObj } from '@storybook/react';

import Apple from './Apple';
import Generic from './Generic';
import Linux from './Linux';
import Microsoft from './Microsoft';

export const PlatformLogos: StoryObj = {
  render: () => (
    <div className="flex flex-row gap-4">
      <div className="flex flex-col items-center gap-4">
        <Linux width={64} height={64} />
        <Apple width={64} height={64} />
        <Microsoft width={64} height={64} />
        <Generic width={64} height={64} />
      </div>
    </div>
  ),
};

export default { title: 'Design System' } as MetaObj;
