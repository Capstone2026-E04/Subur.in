export type DeviceStatus = "ACTIVE" | "INACTIVE";

export interface RegisteredDevice {
  id: string;
  deviceId: string;
  label: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
  sensorInterval?: number;
  plant?: {
    id: string;
    name: string;
  } | null;
  polybag?: {
    id: string;
    name?: string;
    size?: string;
    soilVolumeLiter?: number;
    polybagType?: {
      id: string;
      name: string;
      diameter: number;
      height: number;
    };
  } | null;
}

export interface DiscoveredDevice {
  deviceId: string;
  ph: number;
  moisture: number;
  timestamp: string;
}

export interface PlantOption {
  id: string;
  name: string;
}

export interface Plant {
  id: string;
  name: string;
  scientificName: string | null;
  description: string | null;
  minPh: number;
  maxPh: number;
  phTarget: number;
  minMoisture: number;
  maxMoisture: number;
  targetMoisture: number;
  createdAt: string;
  updatedAt: string;
}

export interface PolybagOption {
  id: string;
  name: string;
  diameter?: number;
  height?: number;
  soilVolumeLiter?: number;
}


export interface ClaimDevicePayload {
  deviceId: string;
  label: string;
  plantId: string;
  polybagId: string;
  sensorInterval?: number;
}

export interface UpdateDevicePayload {
  label?: string;
  plantId?: string;
  polybagId?: string;
  status?: DeviceStatus;
  sensorInterval?: number;
}

export interface SensorHistoryItem {
  id: number;
  timestamp: string;
  deviceId: string;
  ph: number;
  moisture: number;
}

export interface DeviceRecommendation {
  phValue: number;
  moistureValue: number;
  fuzzyIndex: number;
  categoryCode: string;
  actionText: string;
  waterVolumeLiter: number;
  limeDosageGram: number;
  sulfurDosageGram: number;
  reduceWatering: boolean;
  logId?: string;
  timestamp?: string;
}

export interface RecommendationLogItem {
  id: string;
  deviceId: string;
  phValue: number;
  moistureValue: number;
  fuzzyIndex: number;
  categoryCode: string;
  actionText: string;
  waterVolumeLiter: number;
  limeDosageGram: number;
  sulfurDosageGram: number;
  reduceWatering: boolean;
  createdAt: string;
  device?: {
    id: string;
    label: string;
    plant?: {
      name: string;
      scientificName?: string;
    } | null;
  } | null;
}

export interface NotificationItem {
  id: string;
  deviceId: string;
  title: string;
  message: string;
  type: "warning" | "success" | "info";
  isRead: boolean;
  createdAt: string;
  device?: {
    label: string;
  } | null;
}



