const fs = require('fs');
let content = fs.readFileSync('public/helpdesk-admin.html', 'utf8');

const map = {
  'â€¢': '•',
  'ðŸ“‚': '📂',
  'ðŸ“‹': '📋',
  'âœ ï¸ ': '✏️',
  'ðŸ’¼': '💼',
  'ðŸ”§': '🔧',
  'ðŸ§¹': '🧹',
  'ðŸ–¥ï¸ ': '🖥️',
  'ðŸ–¨ï¸ ': '🖨️',
  'ðŸ” ': '🔐',
  'ðŸ“Š': '📊',
  'ðŸŸ¡': '🟡',
  'ðŸŸ¢': '🟢',
  'ðŸ”´': '🔴',
  'â ³': '⏳',
  'âš ï¸ ': '⚠️',
  'â „ï¸ ': '❄️',
  'ðŸ›—': '🛗',
  'ðŸ œ': '🐛',
  'ðŸ“±': '📱',
  'ðŸ“ž': '📞',
  'ðŸŒ ': '🌐',
  'ðŸ’¡': '💡',
  'ðŸ’³': '💳',
  'ðŸ ¡': '🏠',
  'ðŸ’§': '💧',
  'ðŸ’¸': '💸',
  'ðŸ’¾': '💾',
  'ðŸ”™': '🔙',
  'â¬‡ï¸ ': '⬇️',
  'â”€': '─',
  'â Œ': '❌'
};

for (const [bad, good] of Object.entries(map)) {
  content = content.split(bad).join(good);
}

fs.writeFileSync('public/helpdesk-admin.html', content, 'utf8');
console.log('Fully cleaned up icons.');
