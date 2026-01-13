/**
 * Test fixtures and data for E2E tests
 */

export const testUsers = {
  validUser: {
    username: 'testuser1',
    password: 'testuser@123',
  },
  admin: {
    username: 'admin',
    password: 'adminuser@123',
  },
  newUser: {
    username: `testuser_${Date.now()}`,
    email: `test_${Date.now()}@example.com`,
    password: 'TestPassword123!',
  },
};

export const apiBaseUrl = 'http://localhost:8003';
