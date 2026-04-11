/**
 * getSession - shared server-side session helper
 * Mock session: DB connection not ready
 */

const MOCK_SESSION = {
  user: {
    id: '558c1392-8862-4480-9b09-4cafeaa2de15',
    name: 'Boss',
    email: 'suanranger129@gmail.com',
    role: 'DEV',
    roles: ['DEV'],
    employeeId: 'TVS-EMP-0002',
    agentCode: 'BOSS',
    nickName: 'Boss',
  },
  expires: '2099-12-31T00:00:00.000Z',
};

export function getSession() {
  return Promise.resolve(MOCK_SESSION);
}
