
const fs = require("fs");
let files = ["frontend/src/components/purchases/AddPurchaseModal.jsx", "frontend/src/components/purchases/ViewPurchaseModal.jsx", "frontend/src/components/purchases/MarkPurchasedModal.jsx"];
files.forEach(f => {
  let c = fs.readFileSync(f, "utf8");
  if (c.startsWith("Rs. ")) {
    c = c.substring(4);
  }
  fs.writeFileSync(f, c);
});
console.log("Fixed start");

