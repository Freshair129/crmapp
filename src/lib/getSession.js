/**
 * getSession — shared server-side session helper
 * ใช้ mock session เนื่องจาก DB connection ไม่พร้อม
 */

const MOCK_SESSION = {
  user: {
    id: '558c1392-8862-4480-9b09-4cafeaa2de15',
    name: 'พรพล ธนสุวรรณธาร',
    email: 'suanranger129@gmail.com',
    role: 'DEV',
    roles: ['DEV'],
    employeeId: 'TVS-EMP-0002',
    agentCode: 'BOSS',
    nickName: 'บอส',
  },
  expires: '2099-12-31T00:00:00.000Z',
};

export function getSession() {
  return Promise.resolve(MOCK_SESSION);
}
