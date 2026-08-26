
const fs = require("fs");
let c = fs.readFileSync("src/controllers/inventory.controller.js", "utf8");
let lines = c.split("\\n");
lines = lines.filter(l => !l.includes("\\\\n"));
fs.writeFileSync("src/controllers/inventory.controller.js", lines.join("\\n"));
console.log("Done");

