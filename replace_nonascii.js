
const fs = require("fs");
let files = ["frontend/src/components/purchases/ViewPurchaseModal.jsx", "frontend/src/components/purchases/MarkPurchasedModal.jsx"];
files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  c = c.replace(/[^\x00-\x7F]/g, "Rs. ");
  fs.writeFileSync(f, c);
});
console.log("Replaced");

