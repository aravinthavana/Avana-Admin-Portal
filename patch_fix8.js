
const fs = require("fs");
let c = fs.readFileSync("src/controllers/inventory.controller.js", "utf8");
c = c.replace(/\\n/g, "");
fs.writeFileSync("src/controllers/inventory.controller.js", c);
console.log("Done");

