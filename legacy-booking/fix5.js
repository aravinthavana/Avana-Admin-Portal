const fs = require('fs');
let content = fs.readFileSync('public/helpdesk-admin.html', 'utf8');

content = content.replace(/\xe2\u0153\x8f\xef\xb8\x8f/g, '✏️');
content = content.replace(/\xf0\u0178\u2013\xa5\xef\xb8\x8f/g, '🖥️');
content = content.replace(/\xf0\u0178\u2013\xa8\xef\xb8\x8f/g, '🖨️');
content = content.replace(/\xe2\xac\u2021\xef\xb8\x8f/g, '⬇️');
content = content.replace(/\xc3\u2014/g, '×');
content = content.replace(/\xe2\x8f\xb3/g, '⏳');
content = content.replace(/\xe2\u0153\x8f/g, '✏️'); // without variation selector

fs.writeFileSync('public/helpdesk-admin.html', content, 'utf8');
console.log("Fixed final corrupted strings");
