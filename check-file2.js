const fs = require('fs');
const content = fs.readFileSync('backend/src/services/feituoImport.service.ts', 'utf8');
const lines = content.split('\n');
const line = lines[1524];
console.log('Line length:', line.length);
console.log('Char at position 152:', line[152]);
console.log('Char at position 151:', line[151]);
console.log('Char at position 150:', line[150]);

// Show hex values
for (let i = 150; i < 155; i++) {
  console.log(`Position ${i}: '${line[i]}' = 0x${line.charCodeAt(i).toString(16)}`);
}
