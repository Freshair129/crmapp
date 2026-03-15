# Walkthrough: Vitest Unit Tests for CRM Repositories

I have implemented comprehensive unit tests for the core repository functions and utility logic. These tests ensure the reliability of enrollment processing, kitchen stock management, asset ID generation, and data synchronization.

## 🧪 Test Files Created

### 1. Enrollment Repository Tests
- **Path**: [enrollmentRepo.test.js](file:///Users/ideab/Desktop/crm/src/lib/__tests__/enrollmentRepo.test.js)
- **Features Tested**:
    - `updateEnrollmentItemHours`: Verified certificate level upgrades at 30, 111, and 201 hours.
    - `getCustomerEnrollmentSummary`: Verified pure calculation logic for total hours, max cert level, and completed courses.
    - `createEnrollment`: Verified package expansion logic and error handling.

### 2. Kitchen Repository Tests
- **Path**: [kitchenRepo.test.js](file:///Users/ideab/Desktop/crm/src/lib/__tests__/kitchenRepo.test.js)
- **Features Tested**:
    - `calculateStockNeeded`: Verified qty needed based on confirmed vs. max students.
    - `getAllIngredients`: Verified low stock filtering logic.
    - `createPurchaseRequest`: Verified ID generation format (`PR-YYYYMMDD-NNN`) and sufficiency checks.

### 3. Asset Repository Tests
- **Path**: [assetRepo.test.js](file:///Users/ideab/Desktop/crm/src/lib/__tests__/assetRepo.test.js)
- **Features Tested**:
    - `createAsset` (via `generateAssetId`): Verified category-specific ID prefixes (MKT, KTC, OFF, GEN) and serial number incrementing.

### 4. Sync Master Data Tests
- **Path**: [syncMasterData.test.js](file:///Users/ideab/Desktop/crm/src/lib/__tests__/syncMasterData.test.js)
- **Features Tested**:
    - [parseCSV](file:///Users/ideab/Desktop/crm/src/lib/__tests__/syncMasterData.test.js#4-17): Verified robust parsing with various line endings and whitespace handling.
    - BOM Skip Logic: Verified correct counting of skipped rows when dependencies are missing.

---

## 🛠️ Test Configuration
- **Framework**: Vitest
- **Mocking Strategy**: 
    - Database: `@/lib/db` is mocked to prevent real connections.
    - Logger: `@/lib/logger` is mocked to verify logging behavior without side effects.
    - Time: `vi.useFakeTimers()` used for consistent ID generation testing.
