const fs = require('fs');

function fixFile(filePath) {
  let text = fs.readFileSync(filePath, 'utf8');
  
  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
  }

  // The corrupted string was formed by taking UTF-8 bytes and interpreting them as Windows-1252/Latin1.
  // We can convert the corrupted string back to bytes using 'latin1', which directly maps char codes 0-255 to bytes 0-255.
  const buffer = Buffer.from(text, 'latin1');
  
  // Now we have the original UTF-8 bytes. Let's decode them properly.
  let fixedText = buffer.toString('utf8');

  // Let's do a sanity check to see if it worked.
  if (fixedText.includes('—') || fixedText.includes('➕') || fixedText.includes('📦') || fixedText.includes('⚙️')) {
    fs.writeFileSync(filePath, fixedText, 'utf8');
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`Did not fix ${filePath} - maybe it wasn't broken in the way we expected.`);
    
    // Let's print a sample to see what happened
    console.log("Sample of decoding:");
    console.log(fixedText.substring(0, 200));
  }
}

fixFile('public/helpdesk-admin.html');
fixFile('public/asset-acknowledgement.html');
