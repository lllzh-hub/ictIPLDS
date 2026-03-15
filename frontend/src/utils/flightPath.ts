/**
 * 无人机航线规划算法（自 fly-design 迁移）
 * 计算多边形区域内的均匀覆盖航线（平面 2D）。
 * 飞行高度由上层在导出/任务参数中单独设置，不参与平面路径计算。
 */

export type LngLat = [number, number]; // [经度, 纬度]

/**
 * 计算两点之间的距离（米）
 */
export function calculateDistance(point1: LngLat, point2: LngLat): number {
  const R = 6371000;
  const lat1 = (point1[1] * Math.PI) / 180;
  const lat2 = (point2[1] * Math.PI) / 180;
  const dLat = ((point2[1] - point1[1]) * Math.PI) / 180;
  const dLon = ((point2[0] - point1[0]) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * 计算路径总长度（米）
 */
export function calculatePathLength(points: LngLat[]): number {
  let totalLength = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalLength += calculateDistance(points[i], points[i + 1]);
  }
  return totalLength;
}

/**
 * 计算多边形边界框
 */
export function calculateBoundingBox(path: LngLat[]): { min: LngLat; max: LngLat } {
  let minLng = Infinity,
    maxLng = -Infinity;
  let minLat = Infinity,
    maxLat = -Infinity;
  path.forEach((point) => {
    minLng = Math.min(minLng, point[0]);
    maxLng = Math.max(maxLng, point[0]);
    minLat = Math.min(minLat, point[1]);
    maxLat = Math.max(maxLat, point[1]);
  });
  return { min: [minLng, minLat], max: [maxLng, maxLat] };
}

/**
 * 计算两线段交点
 */
export function findIntersection(
  line1Start: LngLat,
  line1End: LngLat,
  line2Start: LngLat,
  line2End: LngLat
): LngLat | null {
  const x1 = line1Start[0],
    y1 = line1Start[1];
  const x2 = line1End[0],
    y2 = line1End[1];
  const x3 = line2Start[0],
    y3 = line2Start[1];
  const x4 = line2End[0],
    y4 = line2End[1];
  const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denominator === 0) return null;
  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denominator;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denominator;
  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return [x1 + t * (x2 - x1), y1 + t * (y2 - y1)];
  }
  return null;
}

export interface IntersectionInfo {
  point: LngLat;
  segmentIndex: number;
}

/**
 * 找出平行线与多边形各边的交点
 */
export function findIntersections(line: [LngLat, LngLat], polygon: LngLat[]): IntersectionInfo[] {
  const intersections: IntersectionInfo[] = [];
  for (let i = 0; i < polygon.length - 1; i++) {
    const intersection = findIntersection(line[0], line[1], polygon[i], polygon[i + 1]);
    if (intersection) {
      intersections.push({ point: intersection, segmentIndex: i });
    }
  }
  const last = findIntersection(
    line[0],
    line[1],
    polygon[polygon.length - 1],
    polygon[0]
  );
  if (last) {
    intersections.push({ point: last, segmentIndex: polygon.length - 1 });
  }
  return intersections;
}

export interface FlightPathResult {
  path: LngLat[];
  waypoints: LngLat[];
}

/**
 * 生成无人机航线路径
 * @param polygon 多边形顶点（不含闭合重复点或含均可，内部会按线段处理）
 * @param spacing 航线间距（米）
 * @param startPoint 起飞点
 * @param direction 扫描方向：水平 / 垂直
 * @param endPoint 降落点，不设则与起飞点一致
 */
export function generateFlightPath(
  polygon: LngLat[],
  spacing: number,
  startPoint: LngLat,
  direction: 'horizontal' | 'vertical' = 'horizontal',
  endPoint: LngLat | null = null
): FlightPathResult {
  const bbox = calculateBoundingBox(polygon);
  const lines: { points: IntersectionInfo[]; coordinate: number; isHorizontal: boolean }[] = [];
  const spacingDegrees = spacing / 111000;

  if (direction === 'horizontal') {
    let currentLat = bbox.min[1];
    while (currentLat <= bbox.max[1]) {
      const line: [LngLat, LngLat] = [
        [bbox.min[0] - 0.01, currentLat],
        [bbox.max[0] + 0.01, currentLat],
      ];
      const intersections = findIntersections(line, polygon);
      if (intersections.length >= 2) {
        const sorted = [...intersections].sort((a, b) => a.point[0] - b.point[0]);
        lines.push({ points: sorted, coordinate: currentLat, isHorizontal: true });
      }
      currentLat += spacingDegrees;
    }
  } else {
    let currentLng = bbox.min[0];
    while (currentLng <= bbox.max[0]) {
      const line: [LngLat, LngLat] = [
        [currentLng, bbox.min[1] - 0.01],
        [currentLng, bbox.max[1] + 0.01],
      ];
      const intersections = findIntersections(line, polygon);
      if (intersections.length >= 2) {
        const sorted = [...intersections].sort((a, b) => a.point[1] - b.point[1]);
        lines.push({ points: sorted, coordinate: currentLng, isHorizontal: false });
      }
      currentLng += spacingDegrees;
    }
  }

  const flightPath: LngLat[] = [startPoint];
  const waypoints: LngLat[] = [];
  let isForward = true;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const points = line.points;
    if (isForward) {
      flightPath.push(points[0].point);
      flightPath.push(points[1].point);
      waypoints.push(points[0].point);
      waypoints.push(points[1].point);
    } else {
      flightPath.push(points[1].point);
      flightPath.push(points[0].point);
      waypoints.push(points[1].point);
      waypoints.push(points[0].point);
    }
    isForward = !isForward;
  }

  const finalPoint = endPoint ?? startPoint;
  flightPath.push(finalPoint);

  return { path: flightPath, waypoints };
}
