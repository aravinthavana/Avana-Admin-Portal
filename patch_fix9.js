
const fs = require("fs");
let c = fs.readFileSync("src/services/inventory.service.js", "utf8");
c = c.replace(/\\n/g, "");
fs.writeFileSync("src/services/inventory.service.js", c);
console.log("Done");

