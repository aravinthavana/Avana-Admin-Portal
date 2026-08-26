
const fs = require("fs");
let c = fs.readFileSync("frontend/src/pages/admin/OperationsModules.jsx", "utf8");
const target = `<FormField label="Remarks">
              <input type="text" className="form-input" value={trackingForm.remarks} onChange={e => setTrackingForm(f => ({ ...f, remarks: e.target.value }))} placeholder="Optional remarks" />
            </FormField>`;
const replacement = target + `
            <FormField label="Tracking Attachment (Optional)">
              <input type="file" className="form-input" accept="image/*,application/pdf" onChange={e => {
                const file = e.target.files[0];
                setTrackingForm(f => ({ ...f, attachment: file }));
              }} />
            </FormField>`;
c = c.replace(target, replacement);
fs.writeFileSync("frontend/src/pages/admin/OperationsModules.jsx", c);
console.log("Done");

