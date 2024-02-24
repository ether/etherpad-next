import type { Meta as MetaObj, StoryObj } from '@storybook/react';

export const Colors: StoryObj = {
  render: () => (
    <div className="flex flex-row justify-between">
      <div className="flex w-full flex-col items-center justify-between gap-1">
        <div className="flex flex-row gap-1">
          <div className="h-20 w-20 bg-ether-100" />
          <div className="h-20 w-20 bg-ether-200" />
          <div className="h-20 w-20 bg-ether-300" />
          <div className="h-20 w-20 bg-ether-400" />
          <div className="h-20 w-20 bg-ether-600" />
          <div className="h-20 w-20 bg-ether-700" />
          <div className="h-20 w-20 bg-ether-800" />
          <div className="h-20 w-20 bg-ether-900" />
        </div>
      </div>
    </div>
  ),
};

export default { title: 'Design System' } as MetaObj;
