const fs = require('fs');
let text = fs.readFileSync('public/helpdesk-admin.html', 'utf8');

function showHex(str) {
  let hex = '';
  for(let i=0; i<str.length; i++) {
    hex += '\\x' + str.charCodeAt(i).toString(16);
  }
  return hex;
}

const lines = text.split('\n');
lines.forEach((line, i) => {
  if (line.includes('Office Asset')) console.log('Office Asset:', showHex(line.trim()));
  if (line.includes('Printing & Scanning')) console.log('Printing:', showHex(line.trim()));
  if (line.includes('Stationery') && (line.includes('â') || line.includes('ð'))) console.log('Stationery:', showHex(line.trim()));
  if (line.includes('Pending') && (line.includes('â') || line.includes('ð'))) console.log('Pending:', showHex(line.trim()));
  if (line.includes('Download') && (line.includes('â') || line.includes('ð'))) console.log('Download:', showHex(line.trim()));
  if (line.includes('Ã—')) console.log('Close:', showHex(line.trim()));
  if (line.includes('🗑️') && line.includes('â')) console.log('Trash:', showHex(line.trim()));
});
