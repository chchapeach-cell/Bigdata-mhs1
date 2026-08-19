const fs = require('fs');
const files = [
  'src/components/ActiveUserSessionMonitor.tsx',
  'src/components/AdminPanel.tsx',
  'src/components/ContactView.tsx',
  'src/components/InactivityLogoutHandler.tsx',
  'src/components/InfrastructureView.tsx',
  'src/components/SchoolDetailView.tsx',
  'src/components/SchoolListView.tsx',
  'src/lib/dbAdapter.ts'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    // regex to replace import something from '../firebase'
    content = content.replace(/import\s*\{[^}]*\}\s*from\s*['"]\.\.\/firebase['"];?\n?/g, '');
    fs.writeFileSync(file, content);
    console.log(`Cleaned ${file}`);
  }
}
