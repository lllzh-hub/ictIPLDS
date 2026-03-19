export interface Defect {
  id?: number;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  location: string;
  description: string;
  status: 'pending' | 'in-progress' | 'review' | 'completed';
  confidence?: number;
  detectedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  originalImage?: string;
  detectionImage?: string;
  thermalImage?: string;
  aiAnalysis?: string;
  solution?: string;
  isFalsePositive?: boolean;
  misdetectionType?: string;
  severityTimeline?: string;
  suggestedDeadline?: string;
}

export interface DetectionResult {
  detected: boolean;
  defects: Array<{
    type: string;
    confidence: number;
    bbox: number[];
    category_id: number;
    description: string;
  }>;
  image_base64?: string;
  location?: {
    latitude: number;
    longitude: number;
    altitude: number;
  };
  timestamp?: string;
  drone_id?: string;
  inference_time_ms?: number;
  image_info?: {
    width: number;
    height: number;
  };
}

export interface ImportResponse {
  success: boolean;
  count: number;
  defects: Defect[];
  message: string;
}
