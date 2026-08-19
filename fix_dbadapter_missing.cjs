const fs = require('fs');
let code = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');

const missingFunctions = `
export async function dbDeleteStudent(studentId: string): Promise<void> {}
export async function dbDeleteStudentG(studentId: string): Promise<void> {}
export async function dbDeleteStudentsByYear(year: string): Promise<number> { return 0; }
export async function dbDeleteStudentsGByYear(year: string): Promise<number> { return 0; }
export async function dbCleanCorruptStudentsG(): Promise<number> { return 0; }
export async function dbSaveSystemConfig(config: any): Promise<void> {}
export async function dbFetchSystemConfig(): Promise<any> { return {}; }
export async function dbDeleteUser(uid: string): Promise<void> {}
`;

if (!code.includes('export async function dbDeleteStudent(')) {
  code = code + '\n' + missingFunctions;
}

fs.writeFileSync('src/lib/dbAdapter.ts', code);
console.log('Added missing functions');
