import { QRCodeSVG } from "qrcode.react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Icon } from "../../components/Icon";
import { Button, Card } from "../../components/ui";
import { api, apiError } from "../../lib/api";
import { rupees } from "../../lib/format";
import { RidePayment } from "../../lib/types";
import { useUI } from "../../store/ui";

export default function PaymentPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useUI((s) => s.toast);
  const [payment, setPayment] = useState<RidePayment | null>(null);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState(false);

  async function load() {
    if (!id) return;
    try {
      const { data } = await api.get(`/api/rides/${id}/payment`);
      setPayment(data.payment);
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied", "success");
    } catch {
      toast("Could not copy", "error");
    }
  }

  async function markPaid(method: "UPI" | "QR" | "CASH") {
    setMarking(true);
    try {
      await api.post(`/api/rides/${id}/payment`, { method });
      toast("Payment recorded", "success");
      await load();
    } catch (err) {
      toast(apiError(err), "error");
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return <div className="py-20 text-center text-slate-500">Loading…</div>;
  }
  if (!payment) {
    return (
      <div className="py-20 text-center text-slate-500">Payment not available.</div>
    );
  }

  const backToRide = () => navigate(`/passenger/ride/${id}`);

  return (
    <div className="mx-auto max-w-md space-y-4">
      <div>
        <h2 className="text-lg font-semibold">Pay your driver</h2>
        <p className="text-sm text-slate-500">
          {payment.driverName} · {rupees(payment.amount)}
        </p>
      </div>

      {payment.paid ? (
        <Card className="text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-green-100 text-green-600">
            <Icon name="check" size={28} />
          </div>
          <p className="font-semibold">Payment complete</p>
          <p className="text-sm text-slate-500">
            {rupees(payment.amount)} paid{payment.method ? ` via ${payment.method}` : ""}.
          </p>
          <Button variant="secondary" className="mt-4 w-full" onClick={backToRide}>
            Back to ride
          </Button>
        </Card>
      ) : payment.upiId ? (
        <>
          <Card className="flex flex-col items-center text-center">
            <p className="mb-3 text-sm text-slate-500">
              Scan with any UPI app to pay {rupees(payment.amount)}
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <QRCodeSVG value={payment.upiLink ?? payment.upiId} size={200} />
            </div>

            <div className="mt-4 flex w-full items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2">
              <span className="truncate text-sm font-medium">{payment.upiId}</span>
              <button
                onClick={() => copy(payment.upiId!)}
                className="shrink-0 text-sm font-medium text-brand-700 hover:text-brand-600"
              >
                Copy
              </button>
            </div>

            {payment.upiLink && (
              <a
                href={payment.upiLink}
                className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-brand-700"
              >
                Open in UPI app
              </a>
            )}
          </Card>

          <Card>
            <p className="text-sm text-slate-600">
              Once you've completed the payment, confirm it below.
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                className="flex-1"
                disabled={marking}
                onClick={() => markPaid("UPI")}
              >
                {marking ? "Saving…" : "I've paid"}
              </Button>
              <Button
                variant="secondary"
                disabled={marking}
                onClick={() => markPaid("CASH")}
              >
                Paid cash
              </Button>
            </div>
          </Card>
        </>
      ) : (
        <Card>
          <p className="text-sm text-slate-600">
            This driver hasn't added a UPI ID, so pay {rupees(payment.amount)} in cash.
          </p>
          <Button
            className="mt-3 w-full"
            disabled={marking}
            onClick={() => markPaid("CASH")}
          >
            {marking ? "Saving…" : "Mark as paid (cash)"}
          </Button>
        </Card>
      )}

      <Button variant="ghost" onClick={backToRide}>
        ← Back to ride
      </Button>
    </div>
  );
}
