
const fs = require("fs");
let lines = fs.readFileSync("src/controllers/inventory.controller.js", "utf8").split("\\n");
for(let i=234; i<240; i++) {
  console.log(i + ": " + JSON.stringify(lines[i]));
}

