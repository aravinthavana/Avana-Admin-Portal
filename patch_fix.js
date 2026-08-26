
const fs = require("fs");
let c = fs.readFileSync("src/controllers/inventory.controller.js", "utf8");
c = c.replace("\\\\n", "\\n");
fs.writeFileSync("src/controllers/inventory.controller.js", c);
console.log("Done");

