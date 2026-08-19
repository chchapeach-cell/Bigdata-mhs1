const fs = require('fs');
let code = fs.readFileSync('src/lib/dbAdapter.ts', 'utf8');

const missingFunctions = `
export async function dbSaveStudentG(student: any): Promise<void> {}
`;

if (!code.includes('export async function dbSaveStudentG(')) {
  code = code + '\n' + missingFunctions;
}

fs.writeFileSync('src/lib/dbAdapter.ts', code);
console.log('Added missing functions');
