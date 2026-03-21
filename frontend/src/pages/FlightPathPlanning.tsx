import { useEffect, useRef, useState } from 'react';
import Icon from '../components/common/Icon';
import {
  type LngLat,
  calculateDistance,
  calculatePathLength,
  generateFlightPath,
} from '../utils/flightPath';

const AMAP_KEY = 'a0c628a7cbe0de2e9ec5a3f548854b58';

// 武汉附近坐标
const WUHAN_CENTER: LngLat = [114.305, 30.593];

// 生成随机巡检区域（矩形）
const generateRandomInspectionArea = (center: LngLat, index: number): LngLat[] => {
  const seed = index * 12345;
  const random = (offset: number) => {
    const x = Math.sin(seed + offset) * 10000;
    return x - Math.floor(x);
  };
  
  // 随机偏移（相对于中心点，单位：0.01度 ≈ 1km）
  const offsetLng = (random(1) - 0.5) * 0.08;
  const offsetLat = (random(2) - 0.5) * 0.08;
  
  // 随机大小（0.02-0.05度）
  const width = 0.02 + random(3) * 0.03;
  const height = 0.02 + random(4) * 0.03;
  
  const centerLng = center[0] + offsetLng;
  const centerLat = center[1] + offsetLat;
  
  const path: LngLat[] = [
    [centerLng - width / 2, centerLat - height / 2],
    [centerLng + width / 2, centerLat - height / 2],
    [centerLng + width / 2, centerLat + height / 2],
    [centerLng - width / 2, centerLat + height / 2],
    [centerLng - width / 2, centerLat - height / 2], // 闭合
  ];
  
  return path;
};

const DEFAULT_PATH: LngLat[] = generateRandomInspectionArea(WUHAN_CENTER, 0);

const DEFAULT_GEOJSON = JSON.stringify(
  {
    type: 'Feature',
    geometry: { type: 'Polygon', coordinates: [DEFAULT_PATH] },
  },
  null,
  2
);

declare global {
  interface Window {
    AMap: any;
  }
}

declare namespace AMap {
  interface MapInstance {
    add: (overlay: object | object[]) => void;
    remove: (overlay: object | object[]) => void;
    setFitView: () => void;
    on: (event: string, cb: (e: unknown) => void) => void;
    destroy: () => void;
  }
  interface PolygonInstance {
    setPath: (path: number[][]) => void;
  }
  interface PolylineInstance {
    setPath?: (path: number[][]) => void;
  }
  interface MarkerInstance {
    setMap: (map: AMap.MapInstance | null) => void;
    setPosition: (pos: number[]) => void;
    getPosition: () => { getLng: () => number; getLat: () => number };
  }
  interface MapsEvent {
    lnglat: { getLng(): number; getLat(): number };
  }
}

export default function FlightPathPlanning() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<AMap.MapInstance | null>(null);
  const polygonRef = useRef<AMap.PolygonInstance | null>(null);
  const flightLineRef = useRef<AMap.PolylineInstance | null>(null);
  const startMarkerRef = useRef<AMap.MarkerInstance | null>(null);
  const endMarkerRef = useRef<AMap.MarkerInstance | null>(null);
  const droneMarkerRef = useRef<AMap.MarkerInstance | null>(null);
  const waypointMarkersRef = useRef<AMap.MarkerInstance[]>([]);
  const satelliteLayerRef = useRef<object | null>(null);
  const animationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentPathIndexRef = useRef(0);
  const isPickingStartRef = useRef(false);
  const isPickingEndRef = useRef(false);

  const [path, setPath] = useState<LngLat[]>(DEFAULT_PATH);
  const [geojsonText, setGeojsonText] = useState(DEFAULT_GEOJSON);
  const [startPoint, setStartPoint] = useState<LngLat>(WUHAN_CENTER);
  const [endPoint, setEndPoint] = useState<LngLat | null>(null);
  const [spacing, setSpacing] = useState(350);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [flightHeight, setFlightHeight] = useState(100); // 飞行高度（米，相对起飞点）
  const [showPath, setShowPath] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [isPickingStart, setIsPickingStart] = useState(false);
  const [isPickingEnd, setIsPickingEnd] = useState(false);
  useEffect(() => {
    isPickingStartRef.current = isPickingStart;
    isPickingEndRef.current = isPickingEnd;
  }, [isPickingStart, isPickingEnd]);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal');
  const [flightData, setFlightData] = useState<{ path: LngLat[]; waypoints: LngLat[] }>({
    path: [],
    waypoints: [],
  });
  const [droneIndex, setDroneIndex] = useState(0);
  const [isDrawingMode, setIsDrawingMode] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<LngLat[]>([]);

  const polygonPath =
    path.length > 1 &&
    path[0][0] === path[path.length - 1][0] &&
    path[0][1] === path[path.length - 1][1]
      ? path.slice(0, -1)
      : path;

  const updateFlightPath = (map: AMap.MapInstance) => {
    const result = generateFlightPath(
      polygonPath,
      spacing,
      startPoint,
      direction,
      endPoint
    );
    setFlightData(result);

    if (flightLineRef.current) {
      map.remove(flightLineRef.current);
      flightLineRef.current = null;
    }
    waypointMarkersRef.current.forEach((m) => {
      map.remove(m);
    });
    waypointMarkersRef.current = [];

    const flightLine = new window.AMap.Polyline({
      path: result.path,
      strokeColor: '#3b82f6',
      strokeWeight: 5,
      strokeStyle: 'solid',
      zIndex: 51,
      showDir: true,
      dirColor: '#ef4444',
    });
    flightLineRef.current = flightLine;
    if (showPath) map.add(flightLine);

    if (showWaypoints) {
      result.waypoints.forEach((point, index) => {
        const marker = new window.AMap.Marker({
          position: point,
          offset: new window.AMap.Pixel(-10, -10),
          content: `<div class="rounded-full border-2 border-sky-500 bg-white px-2 py-0.5 text-sky-600 font-bold text-xs">${index + 1}</div>`,
          zIndex: 52,
        });
        marker.setMap(map);
        waypointMarkersRef.current.push(marker);
      });
    }
  };

  const createMarker = (map: AMap.MapInstance, position: LngLat, title: string) => {
    return new window.AMap.Marker({
      map,
      position,
      icon: new window.AMap.Icon({
        size: new window.AMap.Size(25, 34),
        image: 'https://a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
        imageSize: new window.AMap.Size(25, 34),
      }),
      offset: new window.AMap.Pixel(-13, -30),
      title,
      label: {
        content: `<div class="rounded border-2 border-red-500 bg-white px-2 py-1 text-sm font-bold text-red-600 shadow">${title}</div>`,
        direction: 'right',
        offset: new window.AMap.Pixel(20, 0),
      },
      zIndex: 110,
    });
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const loadAMap = () => {
      return new Promise<void>((resolve, reject) => {
        // 如果 AMap 已加载，直接 resolve
        if (window.AMap) {
          resolve();
          return;
        }
        // 避免重复插入 script 标签
        const existing = document.querySelector('script[data-amap]');
        if (existing) {
          existing.addEventListener('load', () => resolve());
          existing.addEventListener('error', () => reject(new Error('AMap load failed')));
          return;
        }
        const script = document.createElement('script');
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.PolygonEditor`;
        script.async = true;
        script.setAttribute('data-amap', 'true');
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('AMap load failed'));
        document.head.appendChild(script);
      });
    };

    loadAMap()
      .then(() => {
        const AMap = window.AMap;
        const map = new AMap.Map(containerRef.current!, {
          center: WUHAN_CENTER,
          zoom: 13,
          // 方案A：开启 3D 视角（倾斜观察），航线仍按 2D 绘制
          viewMode: '3D',
          pitch: 55,
          rotation: -15,
        });
        mapRef.current = map;

        const polygon = new AMap.Polygon({
          path,
          strokeColor: '#64748b',
          strokeWeight: 2,
          strokeOpacity: 0.8,
          fillColor: '#3b82f6',
          fillOpacity: 0.3,
          zIndex: 50,
          draggable: true,
        });
        polygonRef.current = polygon;
        map.add(polygon);

        // 监听多边形拖动事件
        polygon.on('change', () => {
          const newPath = polygon.getPath();
          setPath(newPath);
        });

        const initialResult = generateFlightPath(
          polygonPath,
          spacing,
          startPoint,
          direction,
          endPoint
        );
        setFlightData(initialResult);

        const flightLine = new AMap.Polyline({
          path: initialResult.path,
          strokeColor: '#3b82f6',
          strokeWeight: 5,
          strokeStyle: 'solid',
          zIndex: 51,
          showDir: true,
          dirColor: '#ef4444',
        });
        flightLineRef.current = flightLine;
        map.add(flightLine);

        const startMarker = createMarker(map, startPoint, '起飞点');
        startMarkerRef.current = startMarker;

        map.on('click', (e: unknown) => {
          const ev = e as { lnglat: { getLng(): number; getLat(): number } };
          const lnglat = ev.lnglat;
          const coords: LngLat = [lnglat.getLng(), lnglat.getLat()];
          
          // 绘制模式
          if (isDrawingMode) {
            const newPoints = [...drawingPoints, coords];
            setDrawingPoints(newPoints);
            
            // 显示绘制点
            const marker = new window.AMap.Marker({
              position: coords,
              offset: new window.AMap.Pixel(-10, -10),
              content: `<div class="rounded-full border-2 border-emerald-500 bg-white px-2 py-0.5 text-emerald-600 font-bold text-xs">${newPoints.length}</div>`,
              zIndex: 52,
            });
            marker.setMap(map);
            return;
          }
          
          if (isPickingStartRef.current) {
            setStartPoint(coords);
            if (startMarkerRef.current) {
              startMarkerRef.current.setMap(null);
            }
            startMarkerRef.current = createMarker(map, coords, '起飞点');
            setIsPickingStart(false);
          } else if (isPickingEndRef.current) {
            setEndPoint(coords);
            if (endMarkerRef.current) {
              endMarkerRef.current.setMap(null);
            }
            endMarkerRef.current = createMarker(map, coords, '降落点');
            setIsPickingEnd(false);
          }
        });
      })
      .catch(console.error);

    return () => {
      animationIntervalRef.current && clearInterval(animationIntervalRef.current);
      if (mapRef.current) {
        mapRef.current.destroy();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !polygonRef.current) return;

    polygonRef.current.setPath(path);
    updateFlightPath(map);
    map.setFitView();
  }, [path, startPoint, endPoint, spacing, direction]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (flightLineRef.current) {
      if (showPath) map.add(flightLineRef.current);
      else map.remove(flightLineRef.current);
    }
    waypointMarkersRef.current.forEach((m) => map.remove(m));
    waypointMarkersRef.current = [];
    if (showWaypoints && flightData.waypoints.length) {
      flightData.waypoints.forEach((point, index) => {
        const marker = new window.AMap.Marker({
          position: point,
          offset: new window.AMap.Pixel(-10, -10),
          content: `<div class="rounded-full border-2 border-sky-500 bg-white px-2 py-0.5 text-sky-600 font-bold text-xs">${index + 1}</div>`,
          zIndex: 52,
        });
        marker.setMap(map);
        waypointMarkersRef.current.push(marker);
      });
    }
  }, [showPath, showWaypoints, flightData]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (mapType === 'satellite') {
      const layer = new window.AMap.TileLayer.Satellite({ zIndex: 10 });
      map.add(layer);
      satelliteLayerRef.current = layer;
    } else {
      if (satelliteLayerRef.current) {
        map.remove(satelliteLayerRef.current);
        satelliteLayerRef.current = null;
      }
    }
  }, [mapType]);

  const applyGeojson = () => {
    try {
      const geojson = JSON.parse(geojsonText);
      if (
        geojson.type !== 'Feature' ||
        geojson.geometry?.type !== 'Polygon' ||
        !Array.isArray(geojson.geometry?.coordinates?.[0])
      ) {
        throw new Error('请使用 Feature 类型的 Polygon GeoJSON');
      }
      setPath(geojson.geometry.coordinates[0]);
      mapRef.current?.setFitView();
    } catch (e) {
      alert('GeoJSON 解析错误：' + (e instanceof Error ? e.message : String(e)));
    }
  };

  const startSimulation = () => {
    if (isSimulating) {
      if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
      if (droneMarkerRef.current && mapRef.current) {
        droneMarkerRef.current.setMap(null);
        droneMarkerRef.current = null;
      }
      setIsSimulating(false);
      currentPathIndexRef.current = 0;
      return;
    }
    if (speed === 0) {
      alert('请设置大于 0 的速度');
      return;
    }
    const map = mapRef.current;
    if (!map || !flightData.path.length) return;

    const droneMarker = new window.AMap.Marker({
      position: flightData.path[0],
      content:
        '<div class="h-5 w-5 rounded-full border-2 border-white bg-red-500 shadow-lg"></div>',
      offset: new window.AMap.Pixel(-10, -10),
      zIndex: 100,
    });
    droneMarker.setMap(map);
    droneMarkerRef.current = droneMarker;
    currentPathIndexRef.current = 0;
    setIsSimulating(true);

    const BASE_INTERVAL = 50;
    const STEP = 10;
    animationIntervalRef.current = setInterval(() => {
      const idx = currentPathIndexRef.current;
      const pathArr = flightData.path;
      if (idx >= pathArr.length - 1) {
        if (animationIntervalRef.current) clearInterval(animationIntervalRef.current);
        droneMarkerRef.current?.setMap(null);
        droneMarkerRef.current = null;
        setIsSimulating(false);
        return;
      }
      const nextPos = pathArr[idx + 1];
      const dronePos = droneMarker.getPosition();
      const cur: LngLat = [dronePos.getLng(), dronePos.getLat()];
      const dist = calculateDistance(cur, nextPos);
      if (dist < STEP) {
        currentPathIndexRef.current = idx + 1;
        droneMarker.setPosition(nextPos);
      } else {
        const ratio = STEP / dist;
        droneMarker.setPosition([
          cur[0] + (nextPos[0] - cur[0]) * ratio,
          cur[1] + (nextPos[1] - cur[1]) * ratio,
        ]);
      }
    }, BASE_INTERVAL / speed);
  };

  const exportGeojson = () => {
    const withAltitude = (coord: LngLat) =>
      [coord[0], coord[1], flightHeight] as [number, number, number];
    const geojson = {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          geometry: { type: 'Polygon', coordinates: [path] },
          properties: { name: '扫描区域' },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: flightData.path.map(withAltitude),
          },
          properties: {
            name: '航线路径',
            spacing,
            flightHeight,
            totalLength: calculatePathLength(flightData.path),
            direction,
          },
        },
        {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: withAltitude(startPoint),
          },
          properties: { name: '起飞点' },
        },
        ...(endPoint
          ? [
              {
                type: 'Feature',
                geometry: {
                  type: 'Point',
                  coordinates: withAltitude(endPoint),
                },
                properties: { name: '降落点' },
              },
            ]
          : []),
      ],
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: 'application/json',
    });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'flight_path.geojson';
    a.click();
    URL.revokeObjectURL(a.href);
  };

  const totalLength = flightData.path.length
    ? Math.round(calculatePathLength(flightData.path))
    : 0;

  const generateRandomArea = () => {
    const newPath = generateRandomInspectionArea(WUHAN_CENTER, droneIndex);
    setPath(newPath);
    setDroneIndex(droneIndex + 1);
    mapRef.current?.setFitView();
  };

  const startDrawing = () => {
    setIsDrawingMode(true);
    setDrawingPoints([]);
  };

  const finishDrawing = () => {
    if (drawingPoints.length < 3) {
      alert('至少需要3个点来形成区域');
      return;
    }
    // 闭合多边形
    const closedPath = [...drawingPoints, drawingPoints[0]];
    setPath(closedPath);
    setIsDrawingMode(false);
    setDrawingPoints([]);
    mapRef.current?.setFitView();
  };

  const cancelDrawing = () => {
    setIsDrawingMode(false);
    setDrawingPoints([]);
  };

  return (
    <div className="relative h-full min-h-[calc(100vh-4rem)] w-full bg-slate-950">
      {/* 左侧面板 */}
      <div className="absolute left-5 top-5 z-[1000] w-80 max-h-[calc(100vh-6rem)] overflow-y-auto rounded-xl border border-slate-700/50 bg-slate-900/95 shadow-xl backdrop-blur">
        <div className="bg-sky-600 px-4 py-3 text-center font-bold text-white">
          无人机飞行路线规划
        </div>

        <div className="space-y-4 border-b border-slate-700/50 p-4">
          <div className="text-sm font-semibold text-slate-200">目标区域设置</div>
          <div className="flex flex-col gap-2">
            <button
              onClick={generateRandomArea}
              className="w-full rounded-lg bg-gradient-to-r from-purple-600 to-pink-600 py-2.5 text-sm font-semibold text-white transition hover:from-purple-500 hover:to-pink-500 flex items-center justify-center gap-2"
            >
              <Icon icon="heroicons:sparkles" />
              随机生成巡检区域
            </button>
            <button
              onClick={startDrawing}
              disabled={isDrawingMode}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition ${
                isDrawingMode
                  ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/50'
                  : 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white hover:from-cyan-500 hover:to-blue-500'
              }`}
            >
              <Icon icon="heroicons:pencil-square" />
              自定义绘制区域
            </button>
          </div>
          
          {isDrawingMode && (
            <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/30 p-3 space-y-2">
              <p className="text-xs text-emerald-400 font-semibold">绘制模式已启用</p>
              <p className="text-xs text-slate-400">在地图上点击添加区域顶点（至少3个点）</p>
              <p className="text-xs text-emerald-400">已添加 {drawingPoints.length} 个点</p>
              <div className="flex gap-2">
                <button
                  onClick={finishDrawing}
                  disabled={drawingPoints.length < 3}
                  className="flex-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-xs font-bold py-1.5 transition"
                >
                  完成绘制
                </button>
                <button
                  onClick={cancelDrawing}
                  className="flex-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 text-xs font-bold py-1.5 transition"
                >
                  取消
                </button>
              </div>
            </div>
          )}
          
          <div className="text-xs text-slate-400 text-center">
            点击多边形可拖动编辑区域
          </div>
          <textarea
            value={geojsonText}
            onChange={(e) => setGeojsonText(e.target.value)}
            placeholder="输入 GeoJSON..."
            className="h-20 w-full resize-y rounded-lg border border-slate-600 bg-slate-800/80 p-3 font-mono text-xs text-slate-200 outline-none focus:border-sky-500"
          />
          <button
            onClick={applyGeojson}
            className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm font-medium text-slate-200 transition hover:border-sky-500 hover:bg-slate-700"
          >
            应用 GeoJSON
          </button>
        </div>

        <div className="space-y-4 border-b border-slate-700/50 p-4">
          <div className="text-sm font-semibold text-slate-200">路线设置</div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setIsPickingStart(true);
                setIsPickingEnd(false);
              }}
              className={`rounded-lg border py-2 text-sm ${isPickingStart ? 'border-sky-500 bg-sky-500/20 text-sky-400' : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'}`}
            >
              设置起飞点
            </button>
            <div className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs text-slate-400">
              起飞点：{startPoint[0].toFixed(6)}, {startPoint[1].toFixed(6)}
            </div>
            <button
              onClick={() => {
                setIsPickingEnd(true);
                setIsPickingStart(false);
              }}
              className={`rounded-lg border py-2 text-sm ${isPickingEnd ? 'border-sky-500 bg-sky-500/20 text-sky-400' : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'}`}
            >
              设置降落点
            </button>
            <div className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs text-slate-400">
              降落点：{endPoint ? `${endPoint[0].toFixed(6)}, ${endPoint[1].toFixed(6)}` : '未设置'}
            </div>
            {(isPickingStart || isPickingEnd) && (
              <p className="text-center text-xs text-sky-400">请在地图上点击选点</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">间距</span>
            <input
              type="range"
              min={100}
              max={1000}
              step={50}
              value={spacing}
              onChange={(e) => setSpacing(Number(e.target.value))}
              className="flex-1 accent-sky-500"
            />
            <span className="w-12 text-right text-sm font-medium text-sky-400">{spacing}m</span>
          </div>
          <button
            onClick={() =>
              setDirection((d) => (d === 'horizontal' ? 'vertical' : 'horizontal'))
            }
            className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:border-sky-500"
          >
            切换为{direction === 'horizontal' ? '垂直' : '水平'}扫描
          </button>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">飞行高度</span>
            <input
              type="number"
              min={20}
              max={500}
              step={10}
              value={flightHeight}
              onChange={(e) => setFlightHeight(Math.max(20, Math.min(500, Number(e.target.value) || 20)))}
              className="w-20 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1.5 text-right text-sm text-slate-200 outline-none focus:border-sky-500"
            />
            <span className="text-sm text-slate-400">米</span>
          </div>
          <p className="text-xs text-slate-500">相对起飞点高度，导出时写入航点</p>
        </div>

        <div className="space-y-4 p-4">
          <div className="text-sm font-semibold text-slate-200">结果显示</div>
          <div className="flex gap-6">
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showPath}
                onChange={(e) => setShowPath(e.target.checked)}
                className="rounded border-slate-600 accent-sky-500"
              />
              显示航线
            </label>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
              <input
                type="checkbox"
                checked={showWaypoints}
                onChange={(e) => setShowWaypoints(e.target.checked)}
                className="rounded border-slate-600 accent-sky-500"
              />
              显示航点
            </label>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-400">速度</span>
            <input
              type="range"
              min={0}
              max={100}
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value))}
              className="flex-1 accent-sky-500"
            />
            <span className="text-sm font-medium text-sky-400">{speed}倍</span>
          </div>
          <button
            onClick={startSimulation}
            className={`w-full rounded-lg py-2 text-sm font-medium ${isSimulating ? 'bg-red-600/20 text-red-400' : 'bg-emerald-600/20 text-emerald-400'} border border-emerald-500/30 hover:bg-emerald-600/30`}
          >
            {isSimulating ? '停止模拟' : '模拟飞行'}
          </button>
          <button
            onClick={exportGeojson}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-500"
          >
            <Icon icon="heroicons:arrow-down-tray" />
            导出航线
          </button>
        </div>
      </div>

      {/* 地图类型 */}
      <div className="absolute right-4 top-4 z-[100] flex gap-1 rounded-lg border border-slate-700/50 bg-slate-900/90 px-1 py-1 backdrop-blur">
        <button
          onClick={() => setMapType('normal')}
          className={`rounded px-3 py-1.5 text-sm ${mapType === 'normal' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          道路地图
        </button>
        <button
          onClick={() => setMapType('satellite')}
          className={`rounded px-3 py-1.5 text-sm ${mapType === 'satellite' ? 'bg-sky-500/20 text-sky-400' : 'text-slate-400 hover:text-slate-200'}`}
        >
          影像地图
        </button>
      </div>

      {/* 右下角航线信息 */}
      <div className="absolute bottom-5 right-4 z-[1000] w-64 rounded-lg border border-slate-700/50 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
        <div className="mb-3 text-sm font-semibold text-slate-200">航线信息</div>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-slate-400">
            <span>航线点数</span>
            <span className="font-medium text-sky-400">{flightData.path.length}</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>航线间距</span>
            <span className="font-medium text-sky-400">{spacing}米</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>飞行高度</span>
            <span className="font-medium text-sky-400">{flightHeight}米</span>
          </div>
          <div className="flex justify-between text-slate-400">
            <span>航线总长</span>
            <span className="font-medium text-sky-400">{totalLength.toLocaleString()}米</span>
          </div>
        </div>
      </div>

      {/* 地图容器 */}
      <div ref={containerRef} className="absolute inset-0 z-0" />
    </div>
  );
}
