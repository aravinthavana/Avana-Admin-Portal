
const fs = require("fs");
let c = fs.readFileSync("frontend/src/components/purchases/ViewPurchaseModal.jsx", "utf8");
console.log(c.substring(c.indexOf("<>"), c.indexOf("</>") + 3));

