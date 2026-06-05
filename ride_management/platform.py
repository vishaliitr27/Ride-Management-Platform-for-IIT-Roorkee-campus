from dataclasses import dataclass
from math import dist
from threading import Lock
from typing import Dict, List, Optional, Tuple
from uuid import uuid4


Coordinate = Tuple[float, float]


@dataclass
class Driver:
    driver_id: str
    location: Coordinate
    online: bool = False


@dataclass
class RideRequest:
    request_id: str
    passenger_id: str
    pickup: Coordinate
    dropoff: Coordinate
    candidate_drivers: List[str]
    accepted_by: Optional[str] = None


@dataclass
class Ride:
    ride_id: str
    request_id: str
    passenger_id: str
    driver_id: str
    pickup: Coordinate
    dropoff: Coordinate
    status: str = "accepted"


class RideManagementPlatform:
    def __init__(self) -> None:
        self._drivers: Dict[str, Driver] = {}
        self._requests: Dict[str, RideRequest] = {}
        self._rides: Dict[str, Ride] = {}
        self._driver_notifications: Dict[str, List[dict]] = {}
        self._passenger_notifications: Dict[str, List[dict]] = {}
        self._lock = Lock()

    def upsert_driver(self, driver_id: str, location: Coordinate, online: bool = True) -> None:
        self._drivers[driver_id] = Driver(driver_id=driver_id, location=location, online=online)
        self._driver_notifications.setdefault(driver_id, [])

    def update_driver_state(
        self, driver_id: str, *, online: Optional[bool] = None, location: Optional[Coordinate] = None
    ) -> None:
        driver = self._drivers[driver_id]
        if online is not None:
            driver.online = online
        if location is not None:
            driver.location = location

    def request_ride(
        self, passenger_id: str, pickup: Coordinate, dropoff: Coordinate, *, max_distance: float = 2.0
    ) -> RideRequest:
        request_id = str(uuid4())
        candidate_drivers = [
            driver.driver_id
            for driver in self._drivers.values()
            if driver.online and dist(driver.location, pickup) <= max_distance
        ]
        ride_request = RideRequest(
            request_id=request_id,
            passenger_id=passenger_id,
            pickup=pickup,
            dropoff=dropoff,
            candidate_drivers=candidate_drivers,
        )
        self._requests[request_id] = ride_request
        self._passenger_notifications.setdefault(passenger_id, []).append(
            {"type": "ride_requested", "request_id": request_id, "nearby_driver_count": len(candidate_drivers)}
        )
        for driver_id in candidate_drivers:
            self._driver_notifications.setdefault(driver_id, []).append(
                {
                    "type": "ride_requested",
                    "request_id": request_id,
                    "passenger_id": passenger_id,
                    "pickup": pickup,
                    "dropoff": dropoff,
                }
            )
        return ride_request

    def accept_request(self, driver_id: str, request_id: str) -> Optional[Ride]:
        with self._lock:
            ride_request = self._requests[request_id]
            if ride_request.accepted_by is not None or driver_id not in ride_request.candidate_drivers:
                return None
            ride_request.accepted_by = driver_id
            ride_id = str(uuid4())
            ride = Ride(
                ride_id=ride_id,
                request_id=request_id,
                passenger_id=ride_request.passenger_id,
                driver_id=driver_id,
                pickup=ride_request.pickup,
                dropoff=ride_request.dropoff,
            )
            self._rides[ride_id] = ride

        self._driver_notifications.setdefault(driver_id, []).append(
            {"type": "ride_assigned", "ride_id": ride.ride_id, "request_id": request_id}
        )
        self._passenger_notifications.setdefault(ride.passenger_id, []).append(
            {"type": "ride_accepted", "ride_id": ride.ride_id, "driver_id": driver_id, "request_id": request_id}
        )
        return ride

    def update_ride_status(self, ride_id: str, status: str) -> Ride:
        ride = self._rides[ride_id]
        ride.status = status
        event = {"type": "ride_status_updated", "ride_id": ride_id, "status": status}
        self._driver_notifications.setdefault(ride.driver_id, []).append(event)
        self._passenger_notifications.setdefault(ride.passenger_id, []).append(event)
        return ride

    def pull_driver_notifications(self, driver_id: str) -> List[dict]:
        events = list(self._driver_notifications.get(driver_id, []))
        self._driver_notifications[driver_id] = []
        return events

    def pull_passenger_notifications(self, passenger_id: str) -> List[dict]:
        events = list(self._passenger_notifications.get(passenger_id, []))
        self._passenger_notifications[passenger_id] = []
        return events
