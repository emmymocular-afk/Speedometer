/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type VehicleType = 'motorbike' | 'car';

export type LimitProfileType = 'urban' | 'suburban' | 'highway' | 'custom';

export interface TripPoint {
  timestamp: number;
  speed: number; // in km/h
  limit: number; // in km/h
}

export interface TripStats {
  maxSpeed: number; // km/h
  avgSpeed: number; // km/h
  distance: number; // km (total distance)
  violationsCount: number;
  duration: number; // seconds
}

export interface AppSettings {
  voiceAlertEnabled: boolean;
  soundAlertEnabled: boolean;
  bufferLimit: number; // buffer speed in km/h (e.g., fine starts at +5 km/h)
  customLimit: number; // customizable custom limit
  simulationActive: boolean;
}

export interface GPSCoords {
  latitude: number | null;
  longitude: number | null;
  altitude: number | null;
  heading: number | null;
  speed: number | null; // raw in m/s
  accuracy: number | null;
}

export interface PresetLimit {
  id: LimitProfileType;
  label: string;
  motorbike: number; // km/h limit
  car: number; // km/h limit
  icon: string;
}

export interface TripRecord {
  id: string;
  startTime: number;
  endTime: number;
  duration: number; // in seconds
  distance: number; // in km
  avgSpeed: number; // in km/h
  maxSpeed: number; // in km/h
  violationsCount: number;
  vehicleType: VehicleType;
}

export interface CustomProfile {
  id: string;
  name: string;
  limit: number; // speed limit in km/h
  alertVolume: number; // alert volume percentage (0 - 100)
  icon: string;
}

