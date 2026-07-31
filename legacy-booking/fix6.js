const fs = require('fs');
let content = fs.readFileSync('public/helpdesk-admin.html', 'utf8');

// Replace hex codes for the remaining corrupted symbols
content = content.replace(/\xe2\x82\xb9/g, '₹');
content = content.replace(/\xf0\x9f\x8c\x90/g, '🌐');
content = content.replace(/\xf0\x9f\x93\xb1/g, '📱');
content = content.replace(/\xf0\x9f\x93\x9e/g, '📞');

// Fallbacks just in case they were slightly different
content = content.replace(/â‚¹/g, '₹');
content = content.replace(/ðŸŒ /g, '🌐');
content = content.replace(/ðŸ“±/g, '📱');
content = content.replace(/ðŸ“ž/g, '📞');

fs.writeFileSync('public/helpdesk-admin.html', content, 'utf8');
