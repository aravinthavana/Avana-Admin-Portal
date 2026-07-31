const fs = require('fs');

function fixCorruptedEmojis(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');

  // Map of corrupted strings to their original emojis
  const fixes = {
    'â€”': '—',
    'âœ…': '✅',
    'âŒ›': '⏳',
    'ðŸ”„': '🔄',
    'ðŸ“¥': '⬇️',
    'ðŸ‘\x81ï¸\x8F': '👁️',
    'ðŸ‘\x81ï¸\x8f': '👁️', // case variant
    'âž•': '➕',
    'ðŸ—‘ï¸\x8F': '🗑️',
    'ðŸ—‘ï¸\x8f': '🗑️',
    'ðŸ“¦': '📦',
    'âš™ï¸\x8F': '⚙️',
    'âš™ï¸\x8f': '⚙️',
    'ðŸ”’': '🔒',
    'ðŸ“§': '📧',
    'ðŸ“„': '📄',
    'â\x9DŒ': '❌',
    'ðŸ”\x8D': '🔍',
    'ðŸ’µ': '💵',
    'ðŸ“…': '📅'
  };

  let changed = false;
  for (const [corrupted, fixed] of Object.entries(fixes)) {
    if (content.includes(corrupted)) {
      content = content.split(corrupted).join(fixed);
      changed = true;
    }
  }

  // There might be some other ones without the variation selector \x8f
  const moreFixes = {
    'ðŸ‘ï¸': '👁️',
    'ðŸ—‘ï¸': '🗑️',
    'âš™ï¸': '⚙️',
    'âŒ': '❌',
    'ðŸ”': '🔍'
  };
  for (const [corrupted, fixed] of Object.entries(moreFixes)) {
    if (content.includes(corrupted)) {
      content = content.split(corrupted).join(fixed);
      changed = true;
    }
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Repaired emojis in ${filePath}`);
  } else {
    console.log(`No corrupted emojis found in ${filePath}`);
  }
}

fixCorruptedEmojis('public/helpdesk-admin.html');
fixCorruptedEmojis('public/asset-acknowledgement.html');
