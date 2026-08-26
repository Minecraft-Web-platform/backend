const fs = require('fs');
const path = require('path');

const originalFile = path.join(__dirname, 'src/states/states.service.ts');
const source = fs.readFileSync(originalFile, 'utf8');

// I will manually use replace_file_content instead of trying to write a complex regex script.
