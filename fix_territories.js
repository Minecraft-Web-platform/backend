const fs = require('fs');
const content = fs.readFileSync('src/states/services/territories.service.ts', 'utf8');
const extracted = fs.readFileSync('extracted_territories.txt', 'utf8');

const lastBraceIndex = content.lastIndexOf('}');
const newContent = content.substring(0, lastBraceIndex) + '\n' + extracted + '\n}\n';

fs.writeFileSync('src/states/services/territories.service.ts', newContent);
console.log('Fixed territories.service.ts');
