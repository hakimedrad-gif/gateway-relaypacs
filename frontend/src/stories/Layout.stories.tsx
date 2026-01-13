import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { Layout } from '../components/Layout';

const meta = {
  title: 'Components/Layout',
  component: Layout,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <div className="h-screen w-full">
          <Story />
        </div>
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Layout>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
