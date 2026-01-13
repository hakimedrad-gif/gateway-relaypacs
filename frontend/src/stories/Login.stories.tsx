import type { Meta, StoryObj } from '@storybook/react';
import { MemoryRouter } from 'react-router-dom';
import { Login } from '../pages/Login';

const meta = {
  title: 'Pages/Login',
  component: Login,
  decorators: [
    (Story) => (
      <MemoryRouter>
        <Story />
      </MemoryRouter>
    ),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof Login>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithPreFilledEmail: Story = {
  play: async ({ canvasElement }) => {
    // We could add interaction testing here later
  },
};
