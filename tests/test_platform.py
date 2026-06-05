import unittest

from ride_management import RideManagementPlatform


class RideManagementPlatformTests(unittest.TestCase):
    def setUp(self) -> None:
        self.platform = RideManagementPlatform()
        self.platform.upsert_driver("d1", (0.0, 0.0), online=True)
        self.platform.upsert_driver("d2", (0.8, 0.6), online=True)
        self.platform.upsert_driver("d3", (10.0, 10.0), online=True)

    def test_only_nearby_online_drivers_receive_request(self) -> None:
        request = self.platform.request_ride("p1", pickup=(0.0, 0.0), dropoff=(1.0, 1.0), max_distance=2.0)

        d1_events = self.platform.pull_driver_notifications("d1")
        d2_events = self.platform.pull_driver_notifications("d2")
        d3_events = self.platform.pull_driver_notifications("d3")

        self.assertEqual(len(d1_events), 1)
        self.assertEqual(len(d2_events), 1)
        self.assertEqual(d1_events[0]["request_id"], request.request_id)
        self.assertEqual(d2_events[0]["request_id"], request.request_id)
        self.assertEqual(d3_events, [])

    def test_single_driver_can_accept_request(self) -> None:
        request = self.platform.request_ride("p1", pickup=(0.0, 0.0), dropoff=(1.0, 1.0), max_distance=2.0)

        first = self.platform.accept_request("d1", request.request_id)
        second = self.platform.accept_request("d2", request.request_id)

        self.assertIsNotNone(first)
        self.assertIsNone(second)

        passenger_events = self.platform.pull_passenger_notifications("p1")
        accepted_events = [e for e in passenger_events if e["type"] == "ride_accepted"]
        self.assertEqual(len(accepted_events), 1)
        self.assertEqual(accepted_events[0]["driver_id"], "d1")

    def test_ride_status_updates_reach_driver_and_passenger(self) -> None:
        request = self.platform.request_ride("p1", pickup=(0.0, 0.0), dropoff=(1.0, 1.0), max_distance=2.0)
        ride = self.platform.accept_request("d2", request.request_id)
        self.assertIsNotNone(ride)

        self.platform.update_ride_status(ride.ride_id, "started")
        self.platform.update_ride_status(ride.ride_id, "completed")

        driver_events = self.platform.pull_driver_notifications("d2")
        passenger_events = self.platform.pull_passenger_notifications("p1")
        driver_statuses = [e["status"] for e in driver_events if e["type"] == "ride_status_updated"]
        passenger_statuses = [e["status"] for e in passenger_events if e["type"] == "ride_status_updated"]

        self.assertEqual(driver_statuses[-2:], ["started", "completed"])
        self.assertEqual(passenger_statuses[-2:], ["started", "completed"])


if __name__ == "__main__":
    unittest.main()
