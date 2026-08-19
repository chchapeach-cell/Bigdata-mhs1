const fs = require('fs');

let adapter = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');

// Ensure dbSaveUser is exported
if (!adapter.includes('export async function dbSaveUser(userProfile: UserProfile): Promise<void> {')) {
  adapter = adapter.replace(/async function dbSaveUser\(userProfile: UserProfile\): Promise<void> \{/g, 'export async function dbSaveUser(userProfile: UserProfile): Promise<void> {');
}

// Add missing functions
const missingFuncs = `
export function safeToDate(val: any): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (val && typeof val === 'object' && 'toDate' in val && typeof val.toDate === 'function') {
    return val.toDate();
  }
  const str = String(val);
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed);
  return new Date();
}

export function safeToISOString(val: any): string {
  try {
    return safeToDate(val).toISOString();
  } catch (e) {
    return new Date().toISOString();
  }
}
`;

if (!adapter.includes('export function safeToDate')) {
  adapter = adapter + missingFuncs;
}

fs.writeFileSync('src/lib/dbAdapter.ts', adapter);
console.log('Fixed dbSaveUser and safeToDate');
