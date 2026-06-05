# Ride-Management-Platform-for-IIT-Roorkee-campus
A real-time ride management platform for a campus served by e-rickshaws. Passengers request rides, nearby online drivers see the request instantly, one driver takes it, and both sides follow the ride through to completion in real time.

## In-memory reference implementation

This repository now contains a small in-memory core implementation in:

- `/tmp/workspace/vishaliitr27/Ride-Management-Platform-for-IIT-Roorkee-campus/ride_management/platform.py`

It supports:

- passenger ride requests
- nearby online driver discovery and instant request fan-out
- single-driver acceptance of a request
- ride status tracking (`accepted -> started -> completed`) with notifications to both driver and passenger
