const fs = require('fs');
const path = require('path');
const prisma = require('../config/db');

async function main() {
  console.log('Migrating employee credentials to database...');

  // 1. Check employee_credentials.json (original root-level file)
  const credentialsPath = path.join(__dirname, '../../employee_credentials.json');
  if (fs.existsSync(credentialsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
      for (const [email, info] of Object.entries(data)) {
        const passwordHash = `${info.salt}:${info.hash}`;
        await prisma.employeeCredential.upsert({
          where: { email: email.toLowerCase() },
          update: { passwordHash },
          create: { email: email.toLowerCase(), passwordHash }
        });
        console.log(`Migrated credential for ${email} from employee_credentials.json`);
      }
    } catch (e) {
      console.error('Error parsing employee_credentials.json:', e);
    }
  }

  // 2. Check employee_passwords.json (temporary file that might have been created)
  const passwordsPath = path.join(__dirname, '../../employee_passwords.json');
  if (fs.existsSync(passwordsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(passwordsPath, 'utf8'));
      for (const [email, passwordHash] of Object.entries(data)) {
        await prisma.employeeCredential.upsert({
          where: { email: email.toLowerCase() },
          update: { passwordHash },
          create: { email: email.toLowerCase(), passwordHash }
        });
        console.log(`Migrated credential for ${email} from employee_passwords.json`);
      }
    } catch (e) {
      console.error('Error parsing employee_passwords.json:', e);
    }
  }

  console.log('Employee credentials migration completed.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
