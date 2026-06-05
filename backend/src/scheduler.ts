import { promoteDueRides } from "./services/ride.service";

// Polls for scheduled rides whose time has come and dispatches them to drivers.
// A short interval is fine at campus scale; a production system would use a job
// queue with per-ride timers instead of polling.
export function startScheduler(intervalMs = 15000): NodeJS.Timeout {
  const tick = async () => {
    try {
      const dispatched = await promoteDueRides();
      if (dispatched > 0) {
        console.log(`Scheduler: dispatched ${dispatched} scheduled ride(s)`);
      }
    } catch (err) {
      console.error("Scheduler error:", err);
    }
  };

  tick(); // run once on boot so anything already due goes out immediately
  return setInterval(tick, intervalMs);
}
