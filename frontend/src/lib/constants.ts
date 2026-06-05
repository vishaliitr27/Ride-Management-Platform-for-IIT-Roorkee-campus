export type SpotCategory =
  | "Hostels"
  | "Academic"
  | "Facilities"
  | "Gates"
  | "Outside campus";

export interface CampusSpot {
  name: string;
  lat: number;
  lng: number;
  category: SpotCategory;
}

// Pickup / destination points around IIT Roorkee. Coordinates are approximate but
// placed sensibly so distance-based fares come out in a reasonable range.
export const CAMPUS_LOCATIONS: CampusSpot[] = [
  // Hostels (Bhawans)
  { name: "Cautley Bhawan", lat: 29.8702, lng: 77.8968, category: "Hostels" },
  { name: "Ganga Bhawan", lat: 29.8695, lng: 77.8978, category: "Hostels" },
  { name: "Govind Bhawan", lat: 29.8688, lng: 77.8985, category: "Hostels" },
  { name: "Jawahar Bhawan", lat: 29.871, lng: 77.8975, category: "Hostels" },
  { name: "Rajendra Bhawan", lat: 29.8715, lng: 77.8982, category: "Hostels" },
  { name: "Radhakrishnan Bhawan", lat: 29.8708, lng: 77.899, category: "Hostels" },
  { name: "Rajiv Bhawan", lat: 29.87, lng: 77.8995, category: "Hostels" },
  { name: "Ravindra Bhawan", lat: 29.8693, lng: 77.8992, category: "Hostels" },
  { name: "Malviya Bhawan", lat: 29.8686, lng: 77.8972, category: "Hostels" },
  { name: "Vivekanand Bhawan", lat: 29.868, lng: 77.8965, category: "Hostels" },
  { name: "Sarojini Bhawan", lat: 29.8672, lng: 77.893, category: "Hostels" },
  { name: "Kasturba Bhawan", lat: 29.8678, lng: 77.8925, category: "Hostels" },
  { name: "Indira Bhawan", lat: 29.8684, lng: 77.8928, category: "Hostels" },
  { name: "Himalaya Bhawan", lat: 29.869, lng: 77.8922, category: "Hostels" },
  { name: "G. P. Hostel", lat: 29.8665, lng: 77.8998, category: "Hostels" },
  { name: "M. R. Chopra Hostel", lat: 29.866, lng: 77.9002, category: "Hostels" },
  { name: "Azad Wing", lat: 29.8712, lng: 77.897, category: "Hostels" },
  { name: "A. N. Khosla House", lat: 29.8675, lng: 77.8948, category: "Hostels" },
  { name: "Khosla International House (KIH)", lat: 29.867, lng: 77.8952, category: "Hostels" },
  { name: "Vigyan Kunj", lat: 29.8682, lng: 77.8978, category: "Hostels" },

  // Academic
  { name: "Main Building", lat: 29.8651, lng: 77.8961, category: "Academic" },
  { name: "Central Library (MGCL)", lat: 29.8649, lng: 77.8959, category: "Academic" },
  { name: "Lecture Hall Complex (LHC)", lat: 29.8643, lng: 77.8965, category: "Academic" },
  { name: "Dept. of Computer Science (CSE)", lat: 29.862, lng: 77.8978, category: "Academic" },
  { name: "Dept. of Electronics (ECE)", lat: 29.8635, lng: 77.8972, category: "Academic" },
  { name: "Dept. of Electrical (EED)", lat: 29.8638, lng: 77.8968, category: "Academic" },
  { name: "Dept. of Civil Engineering", lat: 29.8628, lng: 77.8955, category: "Academic" },
  { name: "Dept. of Mechanical (MIED)", lat: 29.8625, lng: 77.8962, category: "Academic" },
  { name: "Dept. of Chemical Engineering", lat: 29.8632, lng: 77.8948, category: "Academic" },
  { name: "Dept. of Mathematics", lat: 29.8646, lng: 77.8952, category: "Academic" },
  { name: "Dept. of Physics", lat: 29.8644, lng: 77.8946, category: "Academic" },
  { name: "Management Studies (DOMS)", lat: 29.8655, lng: 77.8975, category: "Academic" },
  { name: "Dept. of Architecture", lat: 29.866, lng: 77.897, category: "Academic" },
  { name: "Earthquake Engineering", lat: 29.8648, lng: 77.898, category: "Academic" },
  { name: "Dept. of Hydrology", lat: 29.8652, lng: 77.8985, category: "Academic" },

  // Facilities
  { name: "Institute Hospital", lat: 29.8662, lng: 77.899, category: "Facilities" },
  { name: "Students' Activity Centre (SAC)", lat: 29.8668, lng: 77.8945, category: "Facilities" },
  { name: "Multi Activity Centre (MAC)", lat: 29.8672, lng: 77.894, category: "Facilities" },
  { name: "Sports Stadium", lat: 29.8695, lng: 77.8915, category: "Facilities" },
  { name: "Swimming Pool", lat: 29.869, lng: 77.8908, category: "Facilities" },
  { name: "Convocation Hall", lat: 29.8656, lng: 77.8968, category: "Facilities" },
  { name: "SBI Bank (IITR)", lat: 29.8657, lng: 77.8955, category: "Facilities" },
  { name: "PNB Bank (IITR)", lat: 29.8659, lng: 77.895, category: "Facilities" },

  // Gates
  { name: "Main Gate", lat: 29.8649, lng: 77.8932, category: "Gates" },
  { name: "Century Gate", lat: 29.8625, lng: 77.8945, category: "Gates" },
  { name: "Gate No. 2", lat: 29.8635, lng: 77.8925, category: "Gates" },
  { name: "Gate No. 3", lat: 29.8615, lng: 77.896, category: "Gates" },
  { name: "Gate No. 4", lat: 29.862, lng: 77.899, category: "Gates" },
  { name: "Gate No. 5", lat: 29.8665, lng: 77.9008, category: "Gates" },
  { name: "Gate No. 6", lat: 29.87, lng: 77.9, category: "Gates" },
  { name: "Gate No. 7", lat: 29.8715, lng: 77.896, category: "Gates" },
  { name: "Gate No. 8", lat: 29.8705, lng: 77.8915, category: "Gates" },

  // Outside campus
  { name: "Roorkee Railway Station", lat: 29.8607, lng: 77.877, category: "Outside campus" },
  { name: "Roorkee Bus Stand", lat: 29.858, lng: 77.881, category: "Outside campus" },
  { name: "Civil Lines", lat: 29.86, lng: 77.885, category: "Outside campus" },
  { name: "BT Ganj Market", lat: 29.8645, lng: 77.888, category: "Outside campus" },
];

export const CAMPUS_CENTER = { lat: 29.8665, lng: 77.896 };
