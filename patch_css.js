
const fs = require("fs");
let c = fs.readFileSync("frontend/src/index.css", "utf8");

c = c.replace(".modal {", ".modal, .modal-content {");
c = c.replace(".modal__header {", ".modal__header, .modal-header {");
c = c.replace(".modal__body   {", ".modal__body, .modal-body {");
c = c.replace(".modal__footer {", ".modal__footer, .modal-actions, .modal-footer {");

fs.writeFileSync("frontend/src/index.css", c);
console.log("Patched index.css:", c.includes(".modal-content"));

