
const fs = require("fs");
let c = fs.readFileSync("src/controllers/inventory.controller.js", "utf8");
let lines = c.split(/\r?\n/);
for(let i=234; i<lines.length; i++) {
  console.log((i+1) + ": " + lines[i]);
}

