
const fs = require("fs");
let c = fs.readFileSync("frontend/src/pages/admin/OperationsModules.jsx", "utf8");
c = c.replace(
  /<FormField label="Remarks">[\s\S]*?placeholder="Optional remarks" \/>[\s\S]*?<\/FormField>/,
  `<FormField label="Remarks">
              <input type="text" className="form-input" value={trackingForm.remarks} onChange={e => setTrackingForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks" />
            </FormField>
            <FormField label="Tracking Attachment (Optional)">
              <input type="file" className="form-input" accept="image/*,application/pdf" onChange={e => {
                const file = e.target.files[0];
                setTrackingForm(f => ({ ...f, attachment: file }));
              }} />
            </FormField>`
);
fs.writeFileSync("frontend/src/pages/admin/OperationsModules.jsx", c);
console.log("Patched Ops:", c.includes("Tracking Attachment"));

