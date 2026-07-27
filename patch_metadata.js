const fs = require('fs');
let content = fs.readFileSync('src/utils/initialData.ts', 'utf8');

// Use a regex to replace director, phone, managerPhone, imageUrl in SCHOOL_METADATA_PRESETS
content = content.replace(/director:\s*"[^"]*",/g, 'director: "-",');
content = content.replace(/phone:\s*"[^"]*",/g, 'phone: "-",');
content = content.replace(/managerPhone:\s*"[^"]*"/g, 'managerPhone: "-"');
content = content.replace(/imageUrl:\s*"[^"]*",/g, 'imageUrl: "",');

fs.writeFileSync('src/utils/initialData.ts', content);
