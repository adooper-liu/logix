const fs = require('fs');
const content = fs.readFileSync('backend/src/services/feituoImport.service.ts', 'utf8');
const lines = content.split('\n');
console.log('Line 1525:', lines[1524]);
console.log('Line 1526:', lines[1525]);
