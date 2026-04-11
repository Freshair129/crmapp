/**
 * Mock data for Zuri CRM — V School tenant
 * ครอบคลุมทุก module: employees, customers, courses, orders, tasks,
 * schedules, packages, inventory, kitchen, marketing, assets, recipes, suppliers, etc.
 */

// ─────────────────────────────────────────
// EMPLOYEES
// ─────────────────────────────────────────
export const employees = [
  {
    id: '558c1392-8862-4480-9b09-4cafeaa2de15',
    employeeId: 'TVS-EMP-0002',
    agentId: 'TVS-AGT-0002',
    agentCode: 'BOSS',
    firstName: 'พรพล',
    lastName: 'ธนสุวรรณธาร',
    nickName: 'บอส',
    email: 'suanranger129@gmail.com',
    phone: '0812345678',
    department: 'MANAGEMENT',
    jobTitle: 'CEO & Founder',
    role: 'DEV',
    roles: ['DEV'],
    status: 'ACTIVE',
    isInstructor: false,
    teachableCourseIds: [],
    facebookName: null,
    facebookUrl: null,
    profilePicture: null,
    grade: null,
    identities: [],
    hiredAt: '2023-01-01T00:00:00.000Z',
    dateOfBirth: null,
    createdAt: '2023-01-01T00:00:00.000Z',
    passwordHash: null,
  },
  {
    id: 'emp-instructor-001',
    employeeId: 'TVS-EMP-0003',
    agentId: 'TVS-AGT-0003',
    agentCode: 'CHEF-YUKI',
    firstName: 'ยูกิ',
    lastName: 'ทานากะ',
    nickName: 'ยูกิ',
    email: 'yuki@vschool.th',
    phone: '0898765432',
    department: 'KITCHEN',
    jobTitle: 'Head Instructor',
    role: 'PD',
    roles: ['PD'],
    status: 'ACTIVE',
    isInstructor: true,
    teachableCourseIds: [],
    facebookName: 'Yuki Tanaka Chef',
    facebookUrl: null,
    profilePicture: null,
    grade: 'A',
    identities: [],
    hiredAt: '2023-03-01T00:00:00.000Z',
    dateOfBirth: '1990-05-15T00:00:00.000Z',
    createdAt: '2023-03-01T00:00:00.000Z',
    passwordHash: null,
  },
  {
    id: 'emp-sales-001',
    employeeId: 'TVS-EMP-0004',
    agentId: 'TVS-AGT-0004',
    agentCode: 'PLOY',
    firstName: 'พลอย',
    lastName: 'สุขสันต์',
    nickName: 'พลอย',
    email: 'ploy@vschool.th',
    phone: '0877654321',
    department: 'SALES',
    jobTitle: 'Sales Executive',
    role: 'SLS',
    roles: ['SLS'],
    status: 'ACTIVE',
    isInstructor: false,
    teachableCourseIds: [],
    facebookName: 'Ploy V School',
    facebookUrl: null,
    profilePicture: null,
    grade: 'B',
    identities: [],
    hiredAt: '2023-06-01T00:00:00.000Z',
    dateOfBirth: '1995-08-20T00:00:00.000Z',
    createdAt: '2023-06-01T00:00:00.000Z',
    passwordHash: null,
  },
  {
    id: 'emp-admin-001',
    employeeId: 'TVS-EMP-0005',
    agentId: null,
    agentCode: null,
    firstName: 'มินตรา',
    lastName: 'ศรีสุข',
    nickName: 'มิ้น',
    email: 'min@vschool.th',
    phone: '0856789012',
    department: 'ADMIN',
    jobTitle: 'Admin & Accounting',
    role: 'ADM',
    roles: ['ADM', 'ACC'],
    status: 'ACTIVE',
    isInstructor: false,
    teachableCourseIds: [],
    facebookName: null,
    facebookUrl: null,
    profilePicture: null,
    grade: null,
    identities: [],
    hiredAt: '2023-09-01T00:00:00.000Z',
    dateOfBirth: null,
    createdAt: '2023-09-01T00:00:00.000Z',
    passwordHash: null,
  },
  {
    id: 'emp-instructor-002',
    employeeId: 'TVS-EMP-0006',
    agentId: 'TVS-AGT-0006',
    agentCode: 'CHEF-NON',
    firstName: 'นนท์',
    lastName: 'วิชัยดิษฐ',
    nickName: 'นนท์',
    email: 'non@vschool.th',
    phone: '0823456789',
    department: 'KITCHEN',
    jobTitle: 'Instructor',
    role: 'PD',
    roles: ['PD'],
    status: 'ACTIVE',
    isInstructor: true,
    teachableCourseIds: [],
    facebookName: null,
    facebookUrl: null,
    profilePicture: null,
    grade: 'B',
    identities: [],
    hiredAt: '2024-01-15T00:00:00.000Z',
    dateOfBirth: '1993-12-10T00:00:00.000Z',
    createdAt: '2024-01-15T00:00:00.000Z',
    passwordHash: null,
  },
  {
    id: 'emp-mkt-001',
    employeeId: 'TVS-EMP-0007',
    agentId: 'TVS-AGT-0007',
    agentCode: 'AOI',
    firstName: 'อ้อย',
    lastName: 'พิมพ์ใจ',
    nickName: 'อ้อย',
    email: 'aoi@vschool.th',
    phone: '0811112222',
    department: 'MARKETING',
    jobTitle: 'Marketing Executive',
    role: 'MKT',
    roles: ['MKT'],
    status: 'ACTIVE',
    isInstructor: false,
    teachableCourseIds: [],
    facebookName: 'Aoi V School',
    facebookUrl: null,
    profilePicture: null,
    grade: 'B',
    identities: [],
    hiredAt: '2024-03-01T00:00:00.000Z',
    dateOfBirth: '1997-04-01T00:00:00.000Z',
    createdAt: '2024-03-01T00:00:00.000Z',
    passwordHash: null,
  },
];

// ─────────────────────────────────────────
// CUSTOMERS
// ─────────────────────────────────────────
export const customers = [
  {
    id: 'cust-001',
    customerId: 'TVS-CST-0001',
    firstName: 'สมใจ',
    lastName: 'ใจดี',
    nickName: 'จอย',
    phonePrimary: '0812345001',
    email: 'joy@example.com',
    facebookName: 'Joy Somjai',
    facebookPsid: null,
    lineId: null,
    address: 'กรุงเทพฯ',
    lifecycleStage: 'CUSTOMER',
    membershipTier: 'GOLD',
    vPoints: 1200,
    totalSpend: 45000,
    enrollmentCount: 3,
    createdAt: '2024-01-10T00:00:00.000Z',
    updatedAt: '2024-11-01T00:00:00.000Z',
    tags: [],
    identities: [],
    dateOfBirth: null,
    occupation: 'แม่บ้าน',
    gender: 'FEMALE',
    source: 'FACEBOOK',
  },
  {
    id: 'cust-002',
    customerId: 'TVS-CST-0002',
    firstName: 'วิชัย',
    lastName: 'สมบูรณ์',
    nickName: 'บิ๊ก',
    phonePrimary: '0823456002',
    email: 'big@example.com',
    facebookName: 'Big Wichai',
    facebookPsid: null,
    lineId: null,
    address: 'นนทบุรี',
    lifecycleStage: 'CUSTOMER',
    membershipTier: 'SILVER',
    vPoints: 800,
    totalSpend: 28000,
    enrollmentCount: 2,
    createdAt: '2024-02-15T00:00:00.000Z',
    updatedAt: '2024-10-20T00:00:00.000Z',
    tags: [],
    identities: [],
    dateOfBirth: null,
    occupation: 'พนักงานบริษัท',
    gender: 'MALE',
    source: 'LINE',
  },
  {
    id: 'cust-003',
    customerId: 'TVS-CST-0003',
    firstName: 'ปิยะมาศ',
    lastName: 'แสงทอง',
    nickName: 'ปิ้ง',
    phonePrimary: '0834567003',
    email: null,
    facebookName: 'Ping Piyamas',
    facebookPsid: null,
    lineId: null,
    address: 'สมุทรปราการ',
    lifecycleStage: 'LEAD',
    membershipTier: 'STANDARD',
    vPoints: 0,
    totalSpend: 0,
    enrollmentCount: 0,
    createdAt: '2024-03-20T00:00:00.000Z',
    updatedAt: '2024-11-15T00:00:00.000Z',
    tags: [],
    identities: [],
    dateOfBirth: null,
    occupation: null,
    gender: 'FEMALE',
    source: 'FACEBOOK',
  },
  {
    id: 'cust-004',
    customerId: 'TVS-CST-0004',
    firstName: 'ธนพล',
    lastName: 'รุ่งเรือง',
    nickName: 'พล',
    phonePrimary: '0845678004',
    email: 'phon@example.com',
    facebookName: null,
    facebookPsid: null,
    lineId: '@phon123',
    address: 'ปทุมธานี',
    lifecycleStage: 'CUSTOMER',
    membershipTier: 'PLATINUM',
    vPoints: 3500,
    totalSpend: 120000,
    enrollmentCount: 8,
    createdAt: '2023-08-05T00:00:00.000Z',
    updatedAt: '2024-12-01T00:00:00.000Z',
    tags: ['vip'],
    identities: [],
    dateOfBirth: '1985-03-22T00:00:00.000Z',
    occupation: 'เจ้าของธุรกิจ',
    gender: 'MALE',
    source: 'REFERRAL',
  },
  {
    id: 'cust-005',
    customerId: 'TVS-CST-0005',
    firstName: 'กัญญา',
    lastName: 'วงษ์สุวรรณ',
    nickName: 'กิ๊ก',
    phonePrimary: '0856789005',
    email: 'gig@example.com',
    facebookName: 'Gig Kanya',
    facebookPsid: null,
    lineId: null,
    address: 'กรุงเทพฯ',
    lifecycleStage: 'CUSTOMER',
    membershipTier: 'GOLD',
    vPoints: 950,
    totalSpend: 35000,
    enrollmentCount: 2,
    createdAt: '2024-04-10T00:00:00.000Z',
    updatedAt: '2024-11-30T00:00:00.000Z',
    tags: [],
    identities: [],
    dateOfBirth: null,
    occupation: 'ครู',
    gender: 'FEMALE',
    source: 'FACEBOOK',
  },
  {
    id: 'cust-006',
    customerId: 'TVS-CST-0006',
    firstName: 'อนันต์',
    lastName: 'ทองคำ',
    nickName: 'นัน',
    phonePrimary: '0867890006',
    email: null,
    facebookName: 'Nan Anant',
    facebookPsid: null,
    lineId: null,
    address: 'ชลบุรี',
    lifecycleStage: 'PROSPECT',
    membershipTier: 'STANDARD',
    vPoints: 0,
    totalSpend: 0,
    enrollmentCount: 0,
    createdAt: '2024-11-01T00:00:00.000Z',
    updatedAt: '2024-11-01T00:00:00.000Z',
    tags: [],
    identities: [],
    dateOfBirth: null,
    occupation: null,
    gender: 'MALE',
    source: 'FACEBOOK',
  },
  {
    id: 'cust-007',
    customerId: 'TVS-CST-0007',
    firstName: 'ณัฐกานต์',
    lastName: 'พรหมสวัสดิ์',
    nickName: 'นัท',
    phonePrimary: '0878901007',
    email: 'nat@example.com',
    facebookName: 'Nat Nathakan',
    facebookPsid: null,
    lineId: null,
    address: 'กรุงเทพฯ',
    lifecycleStage: 'CUSTOMER',
    membershipTier: 'SILVER',
    vPoints: 400,
    totalSpend: 15000,
    enrollmentCount: 1,
    createdAt: '2024-06-01T00:00:00.000Z',
    updatedAt: '2024-10-10T00:00:00.000Z',
    tags: [],
    identities: [],
    dateOfBirth: '1992-09-14T00:00:00.000Z',
    occupation: 'พยาบาล',
    gender: 'FEMALE',
    source: 'INSTAGRAM',
  },
];

// ─────────────────────────────────────────
// PRODUCTS (Courses + Packages listed as products)
// ─────────────────────────────────────────
export const products = [
  {
    id: 'prod-001',
    productId: 'TVS-JP-2FC-HO-01',
    name: 'คอร์สซูชิพรีเมียม',
    description: 'เรียนทำซูชิสไตล์ญี่ปุ่นแท้ ตั้งแต่พื้นฐานถึงระดับมืออาชีพ',
    price: 15000,
    hours: 20,
    days: 5,
    duration: 20,
    productType: 'COURSE',
    category: 'JAPANESE',
    cuisineType: 'JAPANESE',
    sessionType: 'GROUP',
    isActive: true,
    maxStudents: 8,
    images: [],
    instructorIds: ['emp-instructor-001'],
    menuIds: [],
    tag: null,
    sortOrder: 1,
    createdAt: '2023-06-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-002',
    productId: 'TVS-JP-2FC-SC-02',
    name: 'คอร์สราเมนและอุด้ง',
    description: 'เรียนทำราเมนโฮมเมด น้ำซุปต้มกระดูก และเส้นอุด้งแบบญี่ปุ่น',
    price: 12000,
    hours: 16,
    days: 4,
    duration: 16,
    productType: 'COURSE',
    category: 'JAPANESE',
    cuisineType: 'JAPANESE',
    sessionType: 'GROUP',
    isActive: true,
    maxStudents: 10,
    images: [],
    instructorIds: ['emp-instructor-001', 'emp-instructor-002'],
    menuIds: [],
    tag: null,
    sortOrder: 2,
    createdAt: '2023-06-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-003',
    productId: 'TVS-JP-2FC-DS-03',
    name: 'คอร์สขนมญี่ปุ่น (Wagashi & Dorayaki)',
    description: 'เรียนทำขนมญี่ปุ่นโบราณและยอดนิยม วากาชิ ดอรายากิ โมจิ',
    price: 9800,
    hours: 12,
    days: 3,
    duration: 12,
    productType: 'COURSE',
    category: 'JAPANESE',
    cuisineType: 'JAPANESE',
    sessionType: 'GROUP',
    isActive: true,
    maxStudents: 12,
    images: [],
    instructorIds: ['emp-instructor-002'],
    menuIds: [],
    tag: 'popular',
    sortOrder: 3,
    createdAt: '2023-09-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-004',
    productId: 'TVS-JP-1FC-HO-04',
    name: 'คอร์ส Private ซาชิมิ',
    description: 'เรียนแบบ Private สำหรับผู้ที่ต้องการความเป็นส่วนตัว',
    price: 25000,
    hours: 8,
    days: 2,
    duration: 8,
    productType: 'COURSE',
    category: 'JAPANESE',
    cuisineType: 'JAPANESE',
    sessionType: 'PRIVATE',
    isActive: true,
    maxStudents: 2,
    images: [],
    instructorIds: ['emp-instructor-001'],
    menuIds: [],
    tag: null,
    sortOrder: 4,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'prod-005',
    productId: 'TVS-JP-2FC-HC-05',
    name: 'คอร์สทำกับข้าวญี่ปุ่นบ้านๆ',
    description: 'สอนทำอาหารญี่ปุ่นสำหรับใช้ที่บ้าน ไม่ยากมาก เหมาะมือใหม่',
    price: 7500,
    hours: 8,
    days: 2,
    duration: 8,
    productType: 'COURSE',
    category: 'JAPANESE',
    cuisineType: 'JAPANESE',
    sessionType: 'GROUP',
    isActive: true,
    maxStudents: 15,
    images: [],
    instructorIds: ['emp-instructor-001', 'emp-instructor-002'],
    menuIds: [],
    tag: 'beginner',
    sortOrder: 5,
    createdAt: '2024-02-01T00:00:00.000Z',
    updatedAt: '2024-02-01T00:00:00.000Z',
  },
];

// ─────────────────────────────────────────
// PACKAGES
// ─────────────────────────────────────────
export const packages = [
  {
    id: 'pkg-001',
    packageId: 'PKG-2024-001',
    name: 'แพ็คเกจ Basic 30 ชั่วโมง',
    description: 'เรียนได้ทุกคอร์ส รวม 30 ชั่วโมง ราคาพิเศษ',
    originalPrice: 36800,
    packagePrice: 18000,
    isActive: true,
    createdAt: '2024-03-01T00:00:00.000Z',
    updatedAt: '2024-03-01T00:00:00.000Z',
    courses: [
      { id: 'pkgc-001', packageId: 'pkg-001', productId: 'prod-001', sortOrder: 1, product: { id: 'prod-001', name: 'คอร์สซูชิพรีเมียม', productId: 'TVS-JP-2FC-HO-01', price: 15000, hours: 20, sessionType: 'GROUP', category: 'JAPANESE' } },
      { id: 'pkgc-002', packageId: 'pkg-001', productId: 'prod-003', sortOrder: 2, product: { id: 'prod-003', name: 'คอร์สขนมญี่ปุ่น', productId: 'TVS-JP-2FC-DS-03', price: 9800, hours: 12, sessionType: 'GROUP', category: 'JAPANESE' } },
    ],
    gifts: [
      { id: 'pkgg-001', packageId: 'pkg-001', name: 'ผ้ากันเปื้อน V School', quantity: 1 },
    ],
    enrollments: [],
  },
  {
    id: 'pkg-002',
    packageId: 'PKG-2024-002',
    name: 'แพ็คเกจ Pro Master 111 ชั่วโมง',
    description: 'คอร์สครบทุกตัว เรียนจนเชี่ยวชาญ เหมาะสายอาชีพ',
    originalPrice: 69300,
    packagePrice: 45000,
    isActive: true,
    createdAt: '2024-05-01T00:00:00.000Z',
    updatedAt: '2024-05-01T00:00:00.000Z',
    courses: [
      { id: 'pkgc-003', packageId: 'pkg-002', productId: 'prod-001', sortOrder: 1, product: { id: 'prod-001', name: 'คอร์สซูชิพรีเมียม', productId: 'TVS-JP-2FC-HO-01', price: 15000, hours: 20, sessionType: 'GROUP', category: 'JAPANESE' } },
      { id: 'pkgc-004', packageId: 'pkg-002', productId: 'prod-002', sortOrder: 2, product: { id: 'prod-002', name: 'คอร์สราเมนและอุด้ง', productId: 'TVS-JP-2FC-SC-02', price: 12000, hours: 16, sessionType: 'GROUP', category: 'JAPANESE' } },
      { id: 'pkgc-005', packageId: 'pkg-002', productId: 'prod-003', sortOrder: 3, product: { id: 'prod-003', name: 'คอร์สขนมญี่ปุ่น', productId: 'TVS-JP-2FC-DS-03', price: 9800, hours: 12, sessionType: 'GROUP', category: 'JAPANESE' } },
      { id: 'pkgc-006', packageId: 'pkg-002', productId: 'prod-005', sortOrder: 4, product: { id: 'prod-005', name: 'คอร์สทำกับข้าวญี่ปุ่นบ้านๆ', productId: 'TVS-JP-2FC-HC-05', price: 7500, hours: 8, sessionType: 'GROUP', category: 'JAPANESE' } },
    ],
    gifts: [
      { id: 'pkgg-002', packageId: 'pkg-002', name: 'ผ้ากันเปื้อน V School', quantity: 1 },
      { id: 'pkgg-003', packageId: 'pkg-002', name: 'หนังสือสูตรอาหารญี่ปุ่น', quantity: 1 },
      { id: 'pkgg-004', packageId: 'pkg-002', name: 'ชุดมีดญี่ปุ่น Starter Set', quantity: 1 },
    ],
    enrollments: [],
  },
];

// ─────────────────────────────────────────
// ORDERS
// ─────────────────────────────────────────
export const orders = [
  {
    id: 'order-001', orderId: 'TVS-ORD-240001',
    customerId: 'cust-001', conversationId: null, productId: 'prod-001',
    status: 'PAID', totalAmount: 15000, paidAmount: 15000, discount: 0,
    note: null, date: '2024-03-15T00:00:00.000Z',
    createdAt: '2024-03-15T00:00:00.000Z', updatedAt: '2024-03-20T00:00:00.000Z',
    paymentMethod: 'BANK_TRANSFER', referenceNumber: 'REF240315001',
    customer: { id: 'cust-001', firstName: 'สมใจ', lastName: 'ใจดี', customerId: 'TVS-CST-0001' },
    product: { id: 'prod-001', name: 'คอร์สซูชิพรีเมียม', productId: 'TVS-JP-2FC-HO-01' },
  },
  {
    id: 'order-002', orderId: 'TVS-ORD-240002',
    customerId: 'cust-002', conversationId: null, productId: 'prod-002',
    status: 'PAID', totalAmount: 12000, paidAmount: 12000, discount: 0,
    note: null, date: '2024-04-10T00:00:00.000Z',
    createdAt: '2024-04-10T00:00:00.000Z', updatedAt: '2024-04-12T00:00:00.000Z',
    paymentMethod: 'PROMPTPAY', referenceNumber: 'REF240410002',
    customer: { id: 'cust-002', firstName: 'วิชัย', lastName: 'สมบูรณ์', customerId: 'TVS-CST-0002' },
    product: { id: 'prod-002', name: 'คอร์สราเมนและอุด้ง', productId: 'TVS-JP-2FC-SC-02' },
  },
  {
    id: 'order-003', orderId: 'TVS-ORD-240003',
    customerId: 'cust-004', conversationId: null, productId: 'prod-004',
    status: 'PAID', totalAmount: 25000, paidAmount: 25000, discount: 0,
    note: 'ลูกค้า VIP', date: '2024-05-20T00:00:00.000Z',
    createdAt: '2024-05-20T00:00:00.000Z', updatedAt: '2024-05-22T00:00:00.000Z',
    paymentMethod: 'CREDIT_CARD', referenceNumber: 'REF240520003',
    customer: { id: 'cust-004', firstName: 'ธนพล', lastName: 'รุ่งเรือง', customerId: 'TVS-CST-0004' },
    product: { id: 'prod-004', name: 'คอร์ส Private ซาชิมิ', productId: 'TVS-JP-1FC-HO-04' },
  },
  {
    id: 'order-004', orderId: 'TVS-ORD-240004',
    customerId: 'cust-005', conversationId: null, productId: 'prod-003',
    status: 'PENDING_PAYMENT', totalAmount: 9800, paidAmount: 0, discount: 200,
    note: null, date: '2024-11-25T00:00:00.000Z',
    createdAt: '2024-11-25T00:00:00.000Z', updatedAt: '2024-11-25T00:00:00.000Z',
    paymentMethod: null, referenceNumber: null,
    customer: { id: 'cust-005', firstName: 'กัญญา', lastName: 'วงษ์สุวรรณ', customerId: 'TVS-CST-0005' },
    product: { id: 'prod-003', name: 'คอร์สขนมญี่ปุ่น', productId: 'TVS-JP-2FC-DS-03' },
  },
  {
    id: 'order-005', orderId: 'TVS-ORD-240005',
    customerId: 'cust-001', conversationId: null, productId: 'prod-003',
    status: 'PAID', totalAmount: 9800, paidAmount: 9800, discount: 0,
    note: null, date: '2024-07-08T00:00:00.000Z',
    createdAt: '2024-07-08T00:00:00.000Z', updatedAt: '2024-07-10T00:00:00.000Z',
    paymentMethod: 'BANK_TRANSFER', referenceNumber: 'REF240708005',
    customer: { id: 'cust-001', firstName: 'สมใจ', lastName: 'ใจดี', customerId: 'TVS-CST-0001' },
    product: { id: 'prod-003', name: 'คอร์สขนมญี่ปุ่น', productId: 'TVS-JP-2FC-DS-03' },
  },
  {
    id: 'order-006', orderId: 'TVS-ORD-240006',
    customerId: 'cust-007', conversationId: null, productId: 'prod-005',
    status: 'PAID', totalAmount: 7500, paidAmount: 7500, discount: 0,
    note: null, date: '2024-08-15T00:00:00.000Z',
    createdAt: '2024-08-15T00:00:00.000Z', updatedAt: '2024-08-16T00:00:00.000Z',
    paymentMethod: 'PROMPTPAY', referenceNumber: 'REF240815006',
    customer: { id: 'cust-007', firstName: 'ณัฐกานต์', lastName: 'พรหมสวัสดิ์', customerId: 'TVS-CST-0007' },
    product: { id: 'prod-005', name: 'คอร์สทำกับข้าวญี่ปุ่นบ้านๆ', productId: 'TVS-JP-2FC-HC-05' },
  },
];

// ─────────────────────────────────────────
// TASKS
// ─────────────────────────────────────────
export const tasks = [
  {
    id: 'task-001', taskId: 'TVS-TSK-240001',
    title: 'ติดตามลูกค้า ปิยะมาศ — ส่ง Brochure',
    description: 'ลูกค้าสอบถามคอร์สซูชิ ส่งรายละเอียดเพิ่มเติม',
    status: 'TODO', priority: 'L1', taskType: 'SINGLE',
    dueDate: '2024-12-05T00:00:00.000Z', startDate: null, timeStart: null, timeEnd: null,
    assigneeId: 'emp-sales-001', customerId: 'cust-003',
    notionId: null, milestones: null, completedAt: null,
    createdAt: '2024-11-28T00:00:00.000Z', updatedAt: '2024-11-28T00:00:00.000Z',
    assignee: { id: 'emp-sales-001', firstName: 'พลอย', lastName: 'สุขสันต์', nickName: 'พลอย', employeeId: 'TVS-EMP-0004' },
    customer: { id: 'cust-003', firstName: 'ปิยะมาศ', lastName: 'แสงทอง', customerId: 'TVS-CST-0003' },
  },
  {
    id: 'task-002', taskId: 'TVS-TSK-240002',
    title: 'เตรียม Content IG — คอร์สขนมญี่ปุ่น',
    description: 'ถ่ายรูปอาหาร + เขียน Caption สำหรับ Instagram',
    status: 'IN_PROGRESS', priority: 'L2', taskType: 'PROJECT',
    dueDate: '2024-12-10T00:00:00.000Z', startDate: '2024-12-01T00:00:00.000Z', timeStart: null, timeEnd: null,
    assigneeId: '558c1392-8862-4480-9b09-4cafeaa2de15', customerId: null,
    notionId: null, milestones: null, completedAt: null,
    createdAt: '2024-11-25T00:00:00.000Z', updatedAt: '2024-12-01T00:00:00.000Z',
    assignee: { id: '558c1392-8862-4480-9b09-4cafeaa2de15', firstName: 'พรพล', lastName: 'ธนสุวรรณธาร', nickName: 'บอส', employeeId: 'TVS-EMP-0002' },
    customer: null,
  },
  {
    id: 'task-003', taskId: 'TVS-TSK-240003',
    title: 'โทรนัดหมาย ธนพล — คอร์ส Private รอบถัดไป',
    description: null,
    status: 'DONE', priority: 'L1', taskType: 'SINGLE',
    dueDate: '2024-11-20T00:00:00.000Z', startDate: null, timeStart: null, timeEnd: null,
    assigneeId: 'emp-sales-001', customerId: 'cust-004',
    notionId: null, milestones: null, completedAt: '2024-11-19T00:00:00.000Z',
    createdAt: '2024-11-15T00:00:00.000Z', updatedAt: '2024-11-19T00:00:00.000Z',
    assignee: { id: 'emp-sales-001', firstName: 'พลอย', lastName: 'สุขสันต์', nickName: 'พลอย', employeeId: 'TVS-EMP-0004' },
    customer: { id: 'cust-004', firstName: 'ธนพล', lastName: 'รุ่งเรือง', customerId: 'TVS-CST-0004' },
  },
  {
    id: 'task-004', taskId: 'TVS-TSK-240004',
    title: 'อัปเดทตาราง Pricing ปี 2025',
    description: 'ทบทวนราคาคอร์สทุกตัว และปรับให้สอดคล้องกับตลาด',
    status: 'TODO', priority: 'L3', taskType: 'SINGLE',
    dueDate: '2024-12-31T00:00:00.000Z', startDate: null, timeStart: null, timeEnd: null,
    assigneeId: '558c1392-8862-4480-9b09-4cafeaa2de15', customerId: null,
    notionId: null, milestones: null, completedAt: null,
    createdAt: '2024-11-20T00:00:00.000Z', updatedAt: '2024-11-20T00:00:00.000Z',
    assignee: { id: '558c1392-8862-4480-9b09-4cafeaa2de15', firstName: 'พรพล', lastName: 'ธนสุวรรณธาร', nickName: 'บอส', employeeId: 'TVS-EMP-0002' },
    customer: null,
  },
  {
    id: 'task-005', taskId: 'TVS-TSK-240005',
    title: 'รันโฆษณา FB — คอร์สขนมญี่ปุ่น Q1/2025',
    description: 'ทำ Ad Creative + เลือก Target audience อายุ 25-45 ปี กทม.',
    status: 'TODO', priority: 'L2', taskType: 'PROJECT',
    dueDate: '2025-01-05T00:00:00.000Z', startDate: null, timeStart: null, timeEnd: null,
    assigneeId: 'emp-mkt-001', customerId: null,
    notionId: null, milestones: null, completedAt: null,
    createdAt: '2024-12-01T00:00:00.000Z', updatedAt: '2024-12-01T00:00:00.000Z',
    assignee: { id: 'emp-mkt-001', firstName: 'อ้อย', lastName: 'พิมพ์ใจ', nickName: 'อ้อย', employeeId: 'TVS-EMP-0007' },
    customer: null,
  },
];

// ─────────────────────────────────────────
// COURSE SCHEDULES (model name: courseSchedule)
// ─────────────────────────────────────────
export const courseSchedules = [
  {
    id: 'sched-001', scheduleId: 'TVS-SCH-240001',
    eventType: 'COURSE', eventTitle: null,
    productId: 'prod-001',
    scheduledDate: '2024-12-10T00:00:00.000Z',
    startTime: '09:00', endTime: '17:00',
    sessionType: 'MORNING',
    maxStudents: 8, confirmedStudents: 5,
    status: 'OPEN',
    instructorId: 'emp-instructor-001',
    classId: 'CLS-202412-001', classroom: 'MAIN_KITCHEN',
    notes: null,
    createdAt: '2024-11-01T00:00:00.000Z', updatedAt: '2024-11-01T00:00:00.000Z',
    product: { id: 'prod-001', name: 'คอร์สซูชิพรีเมียม', duration: 20, days: 5, category: 'JAPANESE' },
    instructor: { firstName: 'ยูกิ', lastName: 'ทานากะ', nickName: 'ยูกิ' },
    productName: 'คอร์สซูชิพรีเมียม',
    instructorName: 'ยูกิ',
    attendances: [],
  },
  {
    id: 'sched-002', scheduleId: 'TVS-SCH-240002',
    eventType: 'COURSE', eventTitle: null,
    productId: 'prod-002',
    scheduledDate: '2024-12-15T00:00:00.000Z',
    startTime: '09:00', endTime: '16:00',
    sessionType: 'MORNING',
    maxStudents: 10, confirmedStudents: 7,
    status: 'OPEN',
    instructorId: 'emp-instructor-001',
    classId: 'CLS-202412-002', classroom: 'MAIN_KITCHEN',
    notes: null,
    createdAt: '2024-11-05T00:00:00.000Z', updatedAt: '2024-11-05T00:00:00.000Z',
    product: { id: 'prod-002', name: 'คอร์สราเมนและอุด้ง', duration: 16, days: 4, category: 'JAPANESE' },
    instructor: { firstName: 'ยูกิ', lastName: 'ทานากะ', nickName: 'ยูกิ' },
    productName: 'คอร์สราเมนและอุด้ง',
    instructorName: 'ยูกิ',
    attendances: [],
  },
  {
    id: 'sched-003', scheduleId: 'TVS-SCH-240003',
    eventType: 'COURSE', eventTitle: null,
    productId: 'prod-003',
    scheduledDate: '2024-12-18T00:00:00.000Z',
    startTime: '10:00', endTime: '15:00',
    sessionType: 'MORNING',
    maxStudents: 12, confirmedStudents: 3,
    status: 'OPEN',
    instructorId: 'emp-instructor-002',
    classId: 'CLS-202412-003', classroom: 'SHOWROOM',
    notes: null,
    createdAt: '2024-11-10T00:00:00.000Z', updatedAt: '2024-11-10T00:00:00.000Z',
    product: { id: 'prod-003', name: 'คอร์สขนมญี่ปุ่น', duration: 12, days: 3, category: 'JAPANESE' },
    instructor: { firstName: 'นนท์', lastName: 'วิชัยดิษฐ', nickName: 'นนท์' },
    productName: 'คอร์สขนมญี่ปุ่น',
    instructorName: 'นนท์',
    attendances: [],
  },
  {
    id: 'sched-004', scheduleId: 'TVS-SCH-240004',
    eventType: 'CHEF_TABLE', eventTitle: '🍽️ Chef Table: Japanese Omakase Night',
    productId: null,
    scheduledDate: '2024-12-22T00:00:00.000Z',
    startTime: '18:00', endTime: '21:00',
    sessionType: 'EVENING',
    maxStudents: 12, confirmedStudents: 8,
    status: 'FULL',
    instructorId: 'emp-instructor-001',
    classId: null, classroom: 'SHOWROOM',
    notes: 'พิเศษ! อาหารเย็นสไตล์ Omakase โดยเชฟยูกิ',
    createdAt: '2024-11-15T00:00:00.000Z', updatedAt: '2024-11-20T00:00:00.000Z',
    product: null,
    instructor: { firstName: 'ยูกิ', lastName: 'ทานากะ', nickName: 'ยูกิ' },
    productName: '🍽️ Chef Table: Japanese Omakase Night',
    instructorName: 'ยูกิ',
    attendances: [],
  },
  {
    id: 'sched-005', scheduleId: 'TVS-SCH-250001',
    eventType: 'COURSE', eventTitle: null,
    productId: 'prod-001',
    scheduledDate: '2025-01-08T00:00:00.000Z',
    startTime: '09:00', endTime: '17:00',
    sessionType: 'MORNING',
    maxStudents: 8, confirmedStudents: 2,
    status: 'OPEN',
    instructorId: 'emp-instructor-001',
    classId: 'CLS-202501-001', classroom: 'MAIN_KITCHEN',
    notes: null,
    createdAt: '2024-12-01T00:00:00.000Z', updatedAt: '2024-12-01T00:00:00.000Z',
    product: { id: 'prod-001', name: 'คอร์สซูชิพรีเมียม', duration: 20, days: 5, category: 'JAPANESE' },
    instructor: { firstName: 'ยูกิ', lastName: 'ทานากะ', nickName: 'ยูกิ' },
    productName: 'คอร์สซูชิพรีเมียม',
    instructorName: 'ยูกิ',
    attendances: [],
  },
];

// ─────────────────────────────────────────
// ENROLLMENTS
// ─────────────────────────────────────────
export const enrollments = [
  {
    id: 'enroll-001', enrollmentId: 'TVS-ENR-240001',
    customerId: 'cust-001', productId: 'prod-001', scheduleId: 'sched-001', orderId: 'order-001',
    status: 'ACTIVE', hoursUsed: 4, totalHours: 20,
    startDate: '2024-12-10T00:00:00.000Z', expiryDate: '2025-06-10T00:00:00.000Z',
    createdAt: '2024-03-15T00:00:00.000Z',
    customer: { id: 'cust-001', firstName: 'สมใจ', lastName: 'ใจดี', customerId: 'TVS-CST-0001' },
    product: { id: 'prod-001', name: 'คอร์สซูชิพรีเมียม', productId: 'TVS-JP-2FC-HO-01' },
  },
  {
    id: 'enroll-002', enrollmentId: 'TVS-ENR-240002',
    customerId: 'cust-002', productId: 'prod-002', scheduleId: 'sched-002', orderId: 'order-002',
    status: 'ACTIVE', hoursUsed: 0, totalHours: 16,
    startDate: '2024-12-15T00:00:00.000Z', expiryDate: '2025-06-15T00:00:00.000Z',
    createdAt: '2024-04-10T00:00:00.000Z',
    customer: { id: 'cust-002', firstName: 'วิชัย', lastName: 'สมบูรณ์', customerId: 'TVS-CST-0002' },
    product: { id: 'prod-002', name: 'คอร์สราเมนและอุด้ง', productId: 'TVS-JP-2FC-SC-02' },
  },
  {
    id: 'enroll-003', enrollmentId: 'TVS-ENR-240003',
    customerId: 'cust-004', productId: 'prod-004', scheduleId: null, orderId: 'order-003',
    status: 'ACTIVE', hoursUsed: 0, totalHours: 8,
    startDate: null, expiryDate: '2025-05-20T00:00:00.000Z',
    createdAt: '2024-05-20T00:00:00.000Z',
    customer: { id: 'cust-004', firstName: 'ธนพล', lastName: 'รุ่งเรือง', customerId: 'TVS-CST-0004' },
    product: { id: 'prod-004', name: 'คอร์ส Private ซาชิมิ', productId: 'TVS-JP-1FC-HO-04' },
  },
  {
    id: 'enroll-004', enrollmentId: 'TVS-ENR-240004',
    customerId: 'cust-007', productId: 'prod-005', scheduleId: null, orderId: 'order-006',
    status: 'COMPLETED', hoursUsed: 8, totalHours: 8,
    startDate: '2024-08-20T00:00:00.000Z', expiryDate: '2025-02-20T00:00:00.000Z',
    createdAt: '2024-08-15T00:00:00.000Z',
    customer: { id: 'cust-007', firstName: 'ณัฐกานต์', lastName: 'พรหมสวัสดิ์', customerId: 'TVS-CST-0007' },
    product: { id: 'prod-005', name: 'คอร์สทำกับข้าวญี่ปุ่นบ้านๆ', productId: 'TVS-JP-2FC-HC-05' },
  },
];

// ─────────────────────────────────────────
// INGREDIENTS (Kitchen Stock)
// ─────────────────────────────────────────
export const ingredients = [
  { id: 'ing-001', ingredientId: 'ING-JP-001', name: 'ข้าวญี่ปุ่น', unit: 'kg', currentStock: 15.5, minStock: 5, category: 'GRAIN', costPerUnit: 80, yieldPercent: 100, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-20T00:00:00.000Z', lots: [] },
  { id: 'ing-002', ingredientId: 'ING-JP-002', name: 'น้ำส้มสายชูข้าว', unit: 'L', currentStock: 4.2, minStock: 2, category: 'CONDIMENT', costPerUnit: 90, yieldPercent: 100, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-18T00:00:00.000Z', lots: [] },
  { id: 'ing-003', ingredientId: 'ING-JP-003', name: 'ปลาแซลมอน (fresh)', unit: 'kg', currentStock: 3.0, minStock: 2, category: 'SEAFOOD', costPerUnit: 650, yieldPercent: 75, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-25T00:00:00.000Z', lots: [] },
  { id: 'ing-004', ingredientId: 'ING-JP-004', name: 'โนริ (สาหร่าย)', unit: 'pack', currentStock: 12, minStock: 5, category: 'DRY_GOODS', costPerUnit: 35, yieldPercent: 100, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-10T00:00:00.000Z', lots: [] },
  { id: 'ing-005', ingredientId: 'ING-JP-005', name: 'วาซาบิผง', unit: 'g', currentStock: 850, minStock: 200, category: 'CONDIMENT', costPerUnit: 0.5, yieldPercent: 100, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-15T00:00:00.000Z', lots: [] },
  { id: 'ing-006', ingredientId: 'ING-JP-006', name: 'กุ้งสด', unit: 'kg', currentStock: 2.5, minStock: 1.5, category: 'SEAFOOD', costPerUnit: 320, yieldPercent: 80, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-22T00:00:00.000Z', lots: [] },
  { id: 'ing-007', ingredientId: 'ING-SW-001', name: 'แป้งข้าวเจ้า', unit: 'kg', currentStock: 8.0, minStock: 3, category: 'GRAIN', costPerUnit: 45, yieldPercent: 100, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-10T00:00:00.000Z', lots: [] },
  { id: 'ing-008', ingredientId: 'ING-SW-002', name: 'ถั่วแดง (anko)', unit: 'kg', currentStock: 5.0, minStock: 2, category: 'INGREDIENT', costPerUnit: 120, yieldPercent: 90, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-08T00:00:00.000Z', lots: [] },
  { id: 'ing-009', ingredientId: 'ING-RM-001', name: 'เส้นราเมน', unit: 'pack', currentStock: 30, minStock: 10, category: 'GRAIN', costPerUnit: 25, yieldPercent: 100, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-20T00:00:00.000Z', lots: [] },
  { id: 'ing-010', ingredientId: 'ING-RM-002', name: 'กระดูกหมู (ต้มซุป)', unit: 'kg', currentStock: 10.0, minStock: 4, category: 'MEAT', costPerUnit: 95, yieldPercent: 60, marketUrl: null, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-11-18T00:00:00.000Z', lots: [] },
];

// ─────────────────────────────────────────
// WAREHOUSES
// ─────────────────────────────────────────
export const warehouses = [
  {
    id: 'wh-001', warehouseId: 'WH-HQ', name: 'คลังสำนักงานใหญ่', code: 'HQ',
    address: 'อาคาร V School ชั้น 1', isActive: true,
    createdAt: '2023-01-01T00:00:00.000Z', updatedAt: '2023-01-01T00:00:00.000Z',
    stockLevels: [],
  },
  {
    id: 'wh-002', warehouseId: 'WH-KIT', name: 'คลังครัว', code: 'KITCHEN',
    address: 'ครัวหลัก ชั้น 2', isActive: true,
    createdAt: '2023-06-01T00:00:00.000Z', updatedAt: '2023-06-01T00:00:00.000Z',
    stockLevels: [],
  },
];

// ─────────────────────────────────────────
// STOCK MOVEMENTS (Inventory)
// ─────────────────────────────────────────
export const stockMovements = [
  {
    id: 'smov-001', movementId: 'MOV-240001', type: 'IN',
    warehouseFromId: null, warehouseToId: 'wh-002',
    ingredientId: 'ing-001', quantity: 10, unit: 'kg',
    note: 'รับสินค้าจาก supplier', referenceId: null,
    createdAt: '2024-11-20T00:00:00.000Z',
    ingredient: { id: 'ing-001', name: 'ข้าวญี่ปุ่น', unit: 'kg' },
    warehouseTo: { id: 'wh-002', name: 'คลังครัว', code: 'KITCHEN' },
    warehouseFrom: null,
  },
  {
    id: 'smov-002', movementId: 'MOV-240002', type: 'OUT',
    warehouseFromId: 'wh-002', warehouseToId: null,
    ingredientId: 'ing-003', quantity: 1.5, unit: 'kg',
    note: 'ใช้สำหรับคอร์สซูชิ', referenceId: 'sched-001',
    createdAt: '2024-12-10T00:00:00.000Z',
    ingredient: { id: 'ing-003', name: 'ปลาแซลมอน (fresh)', unit: 'kg' },
    warehouseFrom: { id: 'wh-002', name: 'คลังครัว', code: 'KITCHEN' },
    warehouseTo: null,
  },
];

// ─────────────────────────────────────────
// STOCK COUNTS
// ─────────────────────────────────────────
export const stockCounts = [
  {
    id: 'sc-001', countId: 'CNT-240001',
    warehouseId: 'wh-002', status: 'COMPLETED',
    note: 'นับสต็อกประจำเดือน พ.ย. 67',
    startedAt: '2024-11-30T09:00:00.000Z', completedAt: '2024-11-30T12:00:00.000Z',
    createdAt: '2024-11-30T00:00:00.000Z',
    warehouse: { id: 'wh-002', name: 'คลังครัว', code: 'KITCHEN' },
    items: [],
  },
];

// ─────────────────────────────────────────
// RECIPES
// ─────────────────────────────────────────
export const recipes = [
  {
    id: 'rcp-001', recipeId: 'RCP-YUK-JP-001',
    name: 'ซูชิชุดอาคาริ (Akari Sushi Set)',
    description: 'ซูชิ 8 ชิ้น นิกิริและมากิ พร้อมน้ำจิ้มโชยุ',
    chef: 'YUK', sellingPrice: 450, estimatedCost: 180,
    category: 'JP', isActive: true,
    createdAt: '2023-08-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    courseMenus: [], ingredients: [],
  },
  {
    id: 'rcp-002', recipeId: 'RCP-YUK-JP-002',
    name: 'ราเมนซุปกระดูก (Tonkotsu Ramen)',
    description: 'ราเมนน้ำซุปกระดูกหมู ต้มนาน 12 ชั่วโมง',
    chef: 'YUK', sellingPrice: 280, estimatedCost: 95,
    category: 'JP', isActive: true,
    createdAt: '2023-08-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    courseMenus: [], ingredients: [],
  },
  {
    id: 'rcp-003', recipeId: 'RCP-NON-JP-001',
    name: 'ดอรายากิแบบดั้งเดิม',
    description: 'ขนมดอรายากิไส้ถั่วแดง สูตรโบราณ',
    chef: 'NON', sellingPrice: 120, estimatedCost: 35,
    category: 'JP', isActive: true,
    createdAt: '2023-10-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    courseMenus: [], ingredients: [],
  },
];

// ─────────────────────────────────────────
// ASSETS (Equipment)
// ─────────────────────────────────────────
export const assets = [
  {
    id: 'asset-001', assetId: 'AST-KIT-001',
    name: 'เตาแก๊สหัวเตาคู่ Rinnai', category: 'EQUIPMENT',
    status: 'ACTIVE', location: 'MAIN_KITCHEN',
    assignedToId: null, purchaseDate: '2023-01-15T00:00:00.000Z',
    purchasePrice: 18500, vendor: 'Rinnai Thailand', serialNumber: 'RN2023-001',
    warrantyExpiry: '2026-01-15T00:00:00.000Z', lastServiceDate: '2024-06-01T00:00:00.000Z',
    notes: null, createdAt: '2023-01-15T00:00:00.000Z', updatedAt: '2024-06-01T00:00:00.000Z', photos: [],
  },
  {
    id: 'asset-002', assetId: 'AST-KIT-002',
    name: 'มีดซาโบะ Yoshihiro 240mm', category: 'TOOL',
    status: 'ACTIVE', location: 'MAIN_KITCHEN',
    assignedToId: 'emp-instructor-001', purchaseDate: '2023-03-01T00:00:00.000Z',
    purchasePrice: 8900, vendor: 'Japan Knife House', serialNumber: null,
    warrantyExpiry: null, lastServiceDate: null,
    notes: 'มีดส่วนตัวเชฟยูกิ', createdAt: '2023-03-01T00:00:00.000Z', updatedAt: '2023-03-01T00:00:00.000Z', photos: [],
  },
  {
    id: 'asset-003', assetId: 'AST-OFF-001',
    name: 'MacBook Air M2 (สำนักงาน)', category: 'IT',
    status: 'ACTIVE', location: 'OFFICE',
    assignedToId: '558c1392-8862-4480-9b09-4cafeaa2de15', purchaseDate: '2023-09-01T00:00:00.000Z',
    purchasePrice: 42000, vendor: 'Apple Thailand', serialNumber: 'FVHQ3XXXX',
    warrantyExpiry: '2024-09-01T00:00:00.000Z', lastServiceDate: null,
    notes: null, createdAt: '2023-09-01T00:00:00.000Z', updatedAt: '2023-09-01T00:00:00.000Z', photos: [],
  },
  {
    id: 'asset-004', assetId: 'AST-KIT-003',
    name: 'เครื่องทำน้ำแข็ง Hoshizaki', category: 'EQUIPMENT',
    status: 'MAINTENANCE', location: 'MAIN_KITCHEN',
    assignedToId: null, purchaseDate: '2022-06-01T00:00:00.000Z',
    purchasePrice: 55000, vendor: 'Hoshizaki Thailand', serialNumber: 'HZ2022-ICE',
    warrantyExpiry: '2025-06-01T00:00:00.000Z', lastServiceDate: '2024-11-10T00:00:00.000Z',
    notes: 'ส่งซ่อม ฟอร์มน้ำแข็งช้า', createdAt: '2022-06-01T00:00:00.000Z', updatedAt: '2024-11-10T00:00:00.000Z', photos: [],
  },
];

// ─────────────────────────────────────────
// SUPPLIERS
// ─────────────────────────────────────────
export const suppliers = [
  {
    id: 'sup-001', supplierId: 'SUP-001',
    name: 'บริษัท ซีฟู้ด เฟรช จำกัด', contactName: 'คุณสมชาย วงศ์ทอง',
    phone: '02-555-1234', email: 'contact@seafoodfresh.th',
    address: '123 ถนนเจริญกรุง กรุงเทพฯ', taxId: '0105567012345',
    bankAccount: 'กสิกรไทย 123-4-56789-0', notes: 'ซัพพลายเออร์หลักซีฟู้ด',
    isActive: true, createdAt: '2023-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'sup-002', supplierId: 'SUP-002',
    name: 'ร้าน ข้าวญี่ปุ่น พรีเมียม', contactName: 'คุณนาโอโกะ อิโตะ',
    phone: '02-666-5678', email: null,
    address: '45 ย่านเยาวราช กรุงเทพฯ', taxId: null,
    bankAccount: 'ไทยพาณิชย์ 456-7-89012-3', notes: 'นำเข้าข้าวญี่ปุ่น Koshihikari',
    isActive: true, createdAt: '2023-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'sup-003', supplierId: 'SUP-003',
    name: 'Makro สาขาลาดพร้าว', contactName: null,
    phone: '02-941-0000', email: null,
    address: 'ลาดพร้าว กรุงเทพฯ', taxId: null,
    bankAccount: null, notes: 'ซื้อวัตถุดิบทั่วไป',
    isActive: true, createdAt: '2023-06-01T00:00:00.000Z', updatedAt: '2023-06-01T00:00:00.000Z',
  },
];

// ─────────────────────────────────────────
// PURCHASE ORDERS (V2)
// ─────────────────────────────────────────
export const purchaseOrdersV2 = [
  {
    id: 'po-001', poId: 'PO-2024-001',
    supplierId: 'sup-001', status: 'DELIVERED',
    totalAmount: 4500, note: 'ออเดอร์ซีฟู้ดประจำสัปดาห์',
    requestedById: '558c1392-8862-4480-9b09-4cafeaa2de15',
    approvedById: '558c1392-8862-4480-9b09-4cafeaa2de15',
    expectedDeliveryDate: '2024-11-22T00:00:00.000Z',
    createdAt: '2024-11-20T00:00:00.000Z', updatedAt: '2024-11-22T00:00:00.000Z',
    supplier: { id: 'sup-001', name: 'บริษัท ซีฟู้ด เฟรช จำกัด', supplierId: 'SUP-001' },
    items: [
      { id: 'poi-001', poId: 'po-001', ingredientId: 'ing-003', name: 'ปลาแซลมอน', quantity: 5, unit: 'kg', unitPrice: 650, totalPrice: 3250 },
      { id: 'poi-002', poId: 'po-001', ingredientId: 'ing-006', name: 'กุ้งสด', quantity: 4, unit: 'kg', unitPrice: 312, totalPrice: 1250 },
    ],
    approvals: [], trackings: [], grns: [],
  },
  {
    id: 'po-002', poId: 'PO-2024-002',
    supplierId: 'sup-002', status: 'PENDING_APPROVAL',
    totalAmount: 3200, note: 'สั่งข้าวญี่ปุ่นล็อตใหม่',
    requestedById: 'emp-admin-001',
    approvedById: null,
    expectedDeliveryDate: '2024-12-05T00:00:00.000Z',
    createdAt: '2024-11-28T00:00:00.000Z', updatedAt: '2024-11-28T00:00:00.000Z',
    supplier: { id: 'sup-002', name: 'ร้าน ข้าวญี่ปุ่น พรีเมียม', supplierId: 'SUP-002' },
    items: [
      { id: 'poi-003', poId: 'po-002', ingredientId: 'ing-001', name: 'ข้าวญี่ปุ่น Koshihikari', quantity: 40, unit: 'kg', unitPrice: 80, totalPrice: 3200 },
    ],
    approvals: [], trackings: [], grns: [],
  },
];

// ─────────────────────────────────────────
// CERTIFICATES
// ─────────────────────────────────────────
export const certificates = [
  {
    id: 'cert-001', certId: 'CERT-20240801-001',
    customerId: 'cust-007', enrollmentId: 'enroll-004',
    certLevel: 'BASIC_30H', hoursAtIssuance: 8,
    issuedAt: '2024-09-01T00:00:00.000Z',
    deliveryStatus: 'DELIVERED',
    trackingNumber: 'EMS123456TH', shippedAt: '2024-09-05T00:00:00.000Z',
    customer: { id: 'cust-007', firstName: 'ณัฐกานต์', lastName: 'พรหมสวัสดิ์', customerId: 'TVS-CST-0007' },
    enrollment: { id: 'enroll-004', enrollmentId: 'TVS-ENR-240004' },
  },
];

// ─────────────────────────────────────────
// MARKETING (Campaigns, Ads)
// ─────────────────────────────────────────
export const campaigns = [
  {
    id: 'camp-001', campaignId: 'CAMP-2024-001',
    name: 'คอร์สซูชิ พ.ย. 2567', objective: 'LEAD_GENERATION',
    status: 'ACTIVE', isVisible: true,
    mappedProductId: 'prod-001', adAccountId: null,
    startDate: '2024-11-01T00:00:00.000Z', endDate: '2024-11-30T00:00:00.000Z',
    fbSpend: 8500, fbClicks: 1240, fbLeads: 38, fbRevenue: 45000, fbSnapshotAt: '2024-11-30T00:00:00.000Z',
    rawData: null, createdAt: '2024-11-01T00:00:00.000Z', updatedAt: '2024-11-30T00:00:00.000Z',
    adSets: [], ads: [],
  },
  {
    id: 'camp-002', campaignId: 'CAMP-2024-002',
    name: 'ขนมญี่ปุ่น ธ.ค. 2567', objective: 'CONVERSIONS',
    status: 'ACTIVE', isVisible: true,
    mappedProductId: 'prod-003', adAccountId: null,
    startDate: '2024-12-01T00:00:00.000Z', endDate: '2024-12-31T00:00:00.000Z',
    fbSpend: 3200, fbClicks: 520, fbLeads: 14, fbRevenue: 19600, fbSnapshotAt: '2024-12-10T00:00:00.000Z',
    rawData: null, createdAt: '2024-12-01T00:00:00.000Z', updatedAt: '2024-12-10T00:00:00.000Z',
    adSets: [], ads: [],
  },
  {
    id: 'camp-003', campaignId: 'CAMP-2024-003',
    name: 'Retargeting VIP ต.ค. 2567', objective: 'RETARGETING',
    status: 'PAUSED', isVisible: true,
    mappedProductId: 'prod-004', adAccountId: null,
    startDate: '2024-10-01T00:00:00.000Z', endDate: '2024-10-31T00:00:00.000Z',
    fbSpend: 5600, fbClicks: 380, fbLeads: 8, fbRevenue: 25000, fbSnapshotAt: '2024-10-31T00:00:00.000Z',
    rawData: null, createdAt: '2024-10-01T00:00:00.000Z', updatedAt: '2024-10-31T00:00:00.000Z',
    adSets: [], ads: [],
  },
];

export const adDailyMetrics = [
  { id: 'adm-001', date: '2024-11-28T00:00:00.000Z', campaignId: 'camp-001', spend: 300, clicks: 45, leads: 2, revenue: 1500, purchases: 1, impressions: 8500, reach: 6200, createdAt: '2024-11-29T00:00:00.000Z' },
  { id: 'adm-002', date: '2024-11-29T00:00:00.000Z', campaignId: 'camp-001', spend: 320, clicks: 52, leads: 3, revenue: 2700, purchases: 2, impressions: 9200, reach: 6800, createdAt: '2024-11-30T00:00:00.000Z' },
  { id: 'adm-003', date: '2024-11-30T00:00:00.000Z', campaignId: 'camp-001', spend: 280, clicks: 38, leads: 1, revenue: 900, purchases: 1, impressions: 7800, reach: 5900, createdAt: '2024-12-01T00:00:00.000Z' },
  { id: 'adm-004', date: '2024-12-01T00:00:00.000Z', campaignId: 'camp-002', spend: 450, clicks: 78, leads: 4, revenue: 3200, purchases: 2, impressions: 12000, reach: 9000, createdAt: '2024-12-02T00:00:00.000Z' },
  { id: 'adm-005', date: '2024-12-05T00:00:00.000Z', campaignId: 'camp-002', spend: 380, clicks: 61, leads: 2, revenue: 1800, purchases: 1, impressions: 10500, reach: 7800, createdAt: '2024-12-06T00:00:00.000Z' },
];

// ─────────────────────────────────────────
// CONVERSATIONS (Inbox)
// ─────────────────────────────────────────
export const conversations = [
  {
    id: 'conv-001', conversationId: 'CONV-FB-001',
    channel: 'FACEBOOK', status: 'open',
    customerId: 'cust-003', assignedToId: 'emp-sales-001',
    lastMessageAt: '2024-11-28T14:30:00.000Z',
    isStarred: true, unreadCount: 2,
    createdAt: '2024-11-27T10:00:00.000Z', updatedAt: '2024-11-28T14:30:00.000Z',
    customer: { id: 'cust-003', firstName: 'ปิยะมาศ', lastName: 'แสงทอง', nickName: 'ปิ้ง', facebookName: 'Ping Piyamas' },
    messages: [
      { id: 'msg-001', conversationId: 'conv-001', role: 'user', content: 'สวัสดีค่ะ สนใจคอร์สซูชิอยากสอบถามราคาค่ะ', timestamp: '2024-11-27T10:00:00.000Z' },
      { id: 'msg-002', conversationId: 'conv-001', role: 'agent', content: 'สวัสดีครับ คุณปิ้ง คอร์สซูชิพรีเมียมราคา 15,000 บาท เรียน 5 วัน ครับ', timestamp: '2024-11-27T10:15:00.000Z' },
    ],
  },
  {
    id: 'conv-002', conversationId: 'CONV-FB-002',
    channel: 'FACEBOOK', status: 'closed',
    customerId: 'cust-006', assignedToId: 'emp-sales-001',
    lastMessageAt: '2024-11-25T16:00:00.000Z',
    isStarred: false, unreadCount: 0,
    createdAt: '2024-11-24T09:00:00.000Z', updatedAt: '2024-11-25T16:00:00.000Z',
    customer: { id: 'cust-006', firstName: 'อนันต์', lastName: 'ทองคำ', nickName: 'นัน', facebookName: 'Nan Anant' },
    messages: [],
  },
];

// ─────────────────────────────────────────
// MARKET PRICES
// ─────────────────────────────────────────
export const marketPrices = [
  { id: 'mp-001', ingredientId: 'ing-003', price: 680, unit: 'kg', source: 'MAKRO', scrapedAt: '2024-11-25T00:00:00.000Z', createdAt: '2024-11-25T00:00:00.000Z', ingredient: { name: 'ปลาแซลมอน (fresh)' } },
  { id: 'mp-002', ingredientId: 'ing-006', price: 330, unit: 'kg', source: 'MAKRO', scrapedAt: '2024-11-25T00:00:00.000Z', createdAt: '2024-11-25T00:00:00.000Z', ingredient: { name: 'กุ้งสด' } },
  { id: 'mp-003', ingredientId: 'ing-001', price: 82, unit: 'kg', source: 'SUPPLIER', scrapedAt: '2024-11-20T00:00:00.000Z', createdAt: '2024-11-20T00:00:00.000Z', ingredient: { name: 'ข้าวญี่ปุ่น' } },
];

// ─────────────────────────────────────────
// AI CONFIG
// ─────────────────────────────────────────
export const aiConfigs = [
  {
    id: 'aic-001', tenantId: 'vschool',
    systemPrompt: 'คุณเป็นผู้ช่วย CRM ของ V School โรงเรียนสอนทำอาหารญี่ปุ่น ตอบกลับลูกค้าด้วยภาษาไทย สุภาพ เป็นกันเอง',
    tone: 'friendly', language: 'TH',
    isActive: true, createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
    knowledgeFiles: [],
  },
];

// ─────────────────────────────────────────
// NOTIFICATION RULES
// ─────────────────────────────────────────
export const notificationRules = [
  {
    id: 'nr-001', name: 'แจ้งเตือนเมื่อ stock ต่ำ',
    trigger: 'STOCK_LOW', condition: { threshold: 'minStock' },
    channels: ['LINE'], isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
  },
  {
    id: 'nr-002', name: 'แจ้งเตือน Lead ใหม่จาก FB',
    trigger: 'NEW_LEAD', condition: { channel: 'FACEBOOK' },
    channels: ['LINE', 'PUSH'], isActive: true,
    createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-01T00:00:00.000Z',
  },
];

// ─────────────────────────────────────────
// AUDIT LOGS
// ─────────────────────────────────────────
export const auditLogs = [
  { id: 'al-001', action: 'ORDER_CREATED', entityType: 'ORDER', entityId: 'order-006', userId: 'emp-sales-001', metadata: { amount: 7500 }, createdAt: '2024-08-15T00:00:00.000Z' },
  { id: 'al-002', action: 'CUSTOMER_UPDATED', entityType: 'CUSTOMER', entityId: 'cust-004', userId: '558c1392-8862-4480-9b09-4cafeaa2de15', metadata: { field: 'membershipTier', value: 'PLATINUM' }, createdAt: '2024-09-01T00:00:00.000Z' },
];

// ─────────────────────────────────────────
// ANALYTICS (pre-computed)
// ─────────────────────────────────────────
export const analyticsSummary = {
  revenue: { current: 61800, previous: 48000, growth: 28.75 },
  orders: { current: 5, previous: 3, growth: 66.67 },
  customers: { total: 7, new: 2, active: 5 },
  conversionRate: 66.7,
  topCourses: [
    { name: 'คอร์ส Private ซาชิมิ', revenue: 25000, count: 1 },
    { name: 'คอร์สซูชิพรีเมียม', revenue: 15000, count: 1 },
    { name: 'คอร์สราเมนและอุด้ง', revenue: 12000, count: 1 },
    { name: 'คอร์สขนมญี่ปุ่น', revenue: 9800, count: 2 },
    { name: 'คอร์สทำกับข้าวญี่ปุ่นบ้านๆ', revenue: 7500, count: 1 },
  ],
};

// ─────────────────────────────────────────
// PACKAGE ENROLLMENTS
// ─────────────────────────────────────────
export const packageEnrollments = [];
export const advances = [];
export const knowledgeFiles = [];
export const pushSubscriptions = [];
export const adReviewResults = [];
export const adsOptimizeRequests = [];
export const classAttendances = [];
export const ingredientLots = [];
export const warehouseStocks = [];
export const productBarcodes = [];
