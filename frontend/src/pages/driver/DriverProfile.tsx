import { ChangeEvent, useEffect, useState } from "react";
import { Button, Card, Field, Input, Select } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { useUI } from "../../store/ui";

export default function DriverProfile() {
  const toast = useUI((s) => s.toast);
  const [form, setForm] = useState({
    vehicleType: "E_RICKSHAW",
    vehicleNumber: "",
    vehicleModel: "",
    licenseNumber: "",
    upiId: "",
  });
  const [status, setStatus] = useState("PENDING");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api
      .get("/api/drivers/me")
      .then(({ data }) => {
        const p = data.profile;
        setForm({
          vehicleType: p.vehicleType,
          vehicleNumber: p.vehicleNumber,
          vehicleModel: p.vehicleModel ?? "",
          licenseNumber: p.licenseNumber,
          upiId: p.upiId ?? "",
        });
        setStatus(p.verificationStatus);
      })
      .catch(() => {});
  }, []);

  const set =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  async function save() {
    setSaving(true);
    try {
      await api.post("/api/drivers/onboard", {
        vehicleType: form.vehicleType,
        vehicleNumber: form.vehicleNumber,
        vehicleModel: form.vehicleModel || undefined,
        licenseNumber: form.licenseNumber,
        upiId: form.upiId || undefined,
      });
      toast("Vehicle details saved", "success");
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setSaving(false);
    }
  }

  const statusColor =
    status === "VERIFIED"
      ? "text-green-600"
      : status === "REJECTED"
        ? "text-rose-600"
        : "text-amber-600";

  return (
    <div className="mx-auto max-w-lg space-y-4">
      <h2 className="text-lg font-semibold">Vehicle &amp; verification</h2>
      <Card>
        <div className="mb-4 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Verification status</span>
          <span className={`font-semibold ${statusColor}`}>{status}</span>
        </div>
        <div className="space-y-3">
          <Field label="Vehicle type">
            <Select value={form.vehicleType} onChange={set("vehicleType")}>
              <option value="E_RICKSHAW">E-Rickshaw</option>
              <option value="CAR">Car</option>
              <option value="BIKE">Bike</option>
            </Select>
          </Field>
          <Field label="Vehicle number">
            <Input value={form.vehicleNumber} onChange={set("vehicleNumber")} />
          </Field>
          <Field label="Model">
            <Input value={form.vehicleModel} onChange={set("vehicleModel")} />
          </Field>
          <Field label="License number">
            <Input value={form.licenseNumber} onChange={set("licenseNumber")} />
          </Field>
          <Field label="UPI ID (for ride payments)">
            <Input
              value={form.upiId}
              onChange={set("upiId")}
              placeholder="yourname@okhdfcbank"
            />
            <span className="text-xs text-slate-400">
              Passengers pay here after a completed ride.
            </span>
          </Field>
          <Button onClick={save} disabled={saving} className="w-full">
            {saving ? "Saving…" : "Save details"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
