
const fs = require("fs");
let c = fs.readFileSync("prisma/schema.prisma", "utf8");
c = c.replace(
  "invoiceFile         String?\\n  itemsJson           String?",
  "invoiceFile         String?\\n    itemsJson           String?"
);
// actually lets just rewrite the line properly
c = c.replace(/invoiceFile         String\?[\s\S]*?itemsJson           String\?/, "invoiceFile         String?\n    itemsJson           String?");
fs.writeFileSync("prisma/schema.prisma", c);
console.log("Fixed schema");

