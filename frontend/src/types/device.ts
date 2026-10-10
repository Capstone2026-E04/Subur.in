export type DeviceStatus = "ACTIVE" | "INACTIVE";

export interface RegisteredDevice {
  id: string;
  deviceCode: string;
  label: string;
  status: DeviceStatus;
  lastSeenAt: string | null;
  createdAt: string;
  sensorInterval?: number;
  plant?: {
    id: string;
    name: string;
  } | null;
}

export interface DiscoveredDevice {
  deviceCode: string;
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
  nmiTrigger: number | null;
  nmiTarget: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimDevicePayload {
  deviceCode: string;
  label: string;
  plantId: string;
  sensorInterval?: number;
}

export interface UpdateDevicePayload {
  label?: string;
  plantId?: string;
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

export type WaterAction = "STOP" | "NONE" | "IRRIGATE";
export type PhAction = "NONE" | "LIME" | "SULFUR";
export type PhCorrectionStatus =
  "NONE" | "READY" | "DEFERRED" | "NEEDS_CONFIRMATION";

export interface PhCorrection {
  status: PhCorrectionStatus;
  reasons: string[];
}

export interface DeviceRecommendation {
  phValue: number;
  moistureValue: number;
  fuzzyIndex: number;
  categoryCode: string;
  actionText: string;
  waterAction: WaterAction;
  phAction: PhAction;
  phCorrection: PhCorrection;
  waterVolumeLiter: number;
  limeDosageGram: number;
  sulfurDosageGram: number;
  reduceWatering: boolean;
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

export type CorrectionType = "LIME" | "SULFUR";
export type CorrectionMethod = "INCORPORATION" | "TOP_DRESSING";

export interface CorrectionRecord {
  id: string;
  deviceId: string;
  type: CorrectionType;
  method: CorrectionMethod;
  doseGram: number;
  phBefore: number;
  appliedAt: string;
  createdAt: string;
}

export interface CorrectionPayload {
  type: CorrectionType;
  method: CorrectionMethod;
  doseGram: number;
  phBefore: number;
  appliedAt?: string;
}
