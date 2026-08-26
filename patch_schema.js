
const fs = require("fs");
let c = fs.readFileSync("prisma/schema.prisma", "utf8");
c = c.replace(
  "invoiceFile         String?",
  "invoiceFile         String?\\n  itemsJson           String?"
);
fs.writeFileSync("prisma/schema.prisma", c);
console.log("Patched schema");

