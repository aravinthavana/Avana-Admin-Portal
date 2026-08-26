
const fs = require("fs");
let c = fs.readFileSync("src/controllers/inventory.controller.js", "utf8");
console.log(c.slice(-500));

