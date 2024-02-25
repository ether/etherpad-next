import React from 'react';
import { withThemeByDataAttribute } from '@storybook/addon-themes';
import { ToastProvider } from '../providers/toast';
import type { Preview, ReactRenderer } from '@storybook/react';
import '../styles/globals.css';

const preview: Preview = {
  parameters: {
    backgrounds: { disable: true },
    actions: { argTypesRegex: '^on[A-Z].*' },
    nextjs: {
      appDirectory: true,
    },
  },
  decorators: [
    withThemeByDataAttribute<ReactRenderer>({
      themes: {
        light: '',
        dark: 'dark',
      },
      defaultTheme: 'light',
      attributeName: 'data-theme',
    }),
    Story => (
      <ToastProvider viewportClassName="absolute top-0 left-0 list-none">
        <Story />
      </ToastProvider>
    ),
  ],
};

export default preview;
