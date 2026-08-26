
const fs = require("fs");
let c = fs.readFileSync("frontend/src/pages/admin/PurchaseApprovalsPage.jsx", "utf8");
c = c.replace(
  "Purchase Approvals",
  "Purchase Requests"
);
fs.writeFileSync("frontend/src/pages/admin/PurchaseApprovalsPage.jsx", c);
console.log("Renamed");

