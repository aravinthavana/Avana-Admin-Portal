const fs = require('fs');
let text = fs.readFileSync('public/helpdesk-admin.html', 'utf8');
const lines = text.split('\n');
let out = '';
lines.forEach((line, i) => {
  if (line.match(/[^\x00-\x7F]/)) {
    out += (i + 1) + ': ' + line.trim() + '\n';
  }
});
fs.writeFileSync('corrupted_lines.txt', out, 'utf8');
console.log("Done dumping non-ascii lines.");
