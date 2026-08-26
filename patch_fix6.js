
const fs = require("fs");
let lines = fs.readFileSync("src/controllers/inventory.controller.js", "utf8").split(/\\r?\\n/);
console.log(JSON.stringify(lines[236]));
lines[236] = "";
fs.writeFileSync("src/controllers/inventory.controller.js", lines.join("\\n"));
console.log("Done");

