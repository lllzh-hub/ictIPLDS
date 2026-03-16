import { useEffect, useRef, useState } from 'react';
import Icon from '../common/Icon';
import {
  type LngLat,
  calculateDistance,
  calculatePathLength,
  generateFlightPath,
} from '../../utils/flightPath';

interface FlightPathModalProps {
  droneId: string;
  onClose: () => void;
}

const AMAP_KEY = 'a0c628a7cbe0de2e9ec5a3f548854b58';
const AMAP_URL = `https://webapi.amap.com/maps?v=2.0&key=${AMAP_KEY}&plugin=AMap.PolygonEditor`;

const DEFAULT_PATH: LngLat[] = [
  [116.362209, 39.887487],
  [116.422897, 39.878002],
  [116.392105, 39.90651],
  [116.372105, 39.91751],
  [116.362105, 39.93751],
  [116.362209, 39.887487],
];

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

export default function FlightPathModal({ droneId, onClose }: FlightPathModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const polygonRef = useRef<any>(null);
  const flightLineRef = useRef<any>(null);
  const startMarkerRef = useRef<any>(null);
  const endMarkerRef = useRef<any>(null);
  const droneMarkerRef = useRef<any>(null);
  const waypointMarkersRef = useRef<any[]>([]);
  const satelliteLayerRef = useRef<any>(null);
  const animationIntervalRef = useRef<any>(null);
  const currentPathIndexRef = useRef(0);
  const isPickingStartRef = useRef(false);
  const isPickingEndRef = useRef(false);

  const [path, setPath] = useState<LngLat[]>(DEFAULT_PATH);
  const [geojsonText, setGeojsonText] = useState(DEFAULT_GEOJSON);
  const [startPoint, setStartPoint] = useState<LngLat>([116.352209, 39.867487]);
  const [endPoint, setEndPoint] = useState<LngLat | null>(null);
  const [spacing, setSpacing] = useState(350);
  const [direction, setDirection] = useState<'horizontal' | 'vertical'>('horizontal');
  const [flightHeight, setFlightHeight] = useState(100);
  const [showPath, setShowPath] = useState(true);
  const [showWaypoints, setShowWaypoints] = useState(false);
  const [speed, setSpeed] = useState(10);
  const [isPickingStart, setIsPickingStart] = useState(false);
  const [isPickingEnd, setIsPickingEnd] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [mapType, setMapType] = useState<'normal' | 'satellite'>('normal');
  const [flightData, setFlightData] = useState<{ path: LngLat[]; waypoints: LngLat[] }>({
    path: [],
    waypoints: [],
  });

  useEffect(() => {
    isPickingStartRef.current = isPickingStart;
    isPickingEndRef.current = isPickingEnd;
  }, [isPickingStart, isPickingEnd]);

  const polygonPath =
    path.length > 1 &&
    path[0][0] === path[path.length - 1][0] &&
    path[0][1] === path[path.length - 1][1]
      ? path.slice(0, -1)
      : path;

  const updateFlightPath = (map: any) => {
    const result = generateFlightPath(polygonPath, spacing, startPoint, direction, endPoint);
    setFlightData(result);

    if (flightLineRef.current) {
      map.remove(flightLineRef.current);
      flightLineRef.current = null;
    }
    waypointMarkersRef.current.forEach((m) => map.remove(m));
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

  const createMarker = (map: any, position: LngLat, title: string) => {
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
        if (window.AMap) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = AMAP_URL;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('AMap load failed'));
        document.head.appendChild(script);
      });
    };

    loadAMap()
      .then(() => {
        const AMap = window.AMap;
        const map = new AMap.Map(containerRef.current!, {
          center: [116.395577, 39.892257],
          zoom: 14,
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
        });
        polygonRef.current = polygon;
        map.add(polygon);

        const initialResult = generateFlightPath(polygonPath, spacing, startPoint, direction, endPoint);
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

        map.on('click', (e: any) => {
          const lnglat = e.lnglat;
          const coords: LngLat = [lnglat.getLng(), lnglat.getLat()];
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
      content: '<div class="h-5 w-5 rounded-full border-2 border-white bg-red-500 shadow-lg"></div>',
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

  const saveFlightPath = async () => {
    const withAltitude = (coord: LngLat) => [coord[0], coord[1], flightHeight] as [number, number, number];
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
          geometry: { type: 'Point', coordinates: withAltitude(startPoint) },
          properties: { name: '起飞点' },
        },
        ...(endPoint
          ? [
              {
                type: 'Feature',
                geometry: { type: 'Point', coordinates: withAltitude(endPoint) },
                properties: { name: '降落点' },
              },
            ]
          : []),
      ],
    };

    try {
      const response = await fetch('http://localhost:8080/api/flight-paths', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          droneId,
          name: `${droneId} 航线规划 ${new Date().toLocaleString('zh-CN')}`,
          description: '自动生成的航线规划',
          pathData: JSON.stringify(geojson),
          spacing,
          direction,
          flightHeight,
          startLat: startPoint[1],
          startLon: startPoint[0],
          endLat: endPoint?.[1],
          endLon: endPoint?.[0],
          waypointCount: flightData.waypoints.length,
          totalLength: calculatePathLength(flightData.path),
          status: 'DRAFT',
        }),
      });

      if (response.ok) {
        alert('航线保存成功！');
      } else {
        alert('航线保存失败');
      }
    } catch (error) {
      console.error('保存航线失败:', error);
      alert('航线保存失败');
    }
  };

  const totalLength = flightData.path.length ? Math.round(calculatePathLength(flightData.path)) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 rounded-2xl border border-slate-700/50 w-full h-[95vh] flex flex-col shadow-2xl max-w-[98vw]">
        {/* 头部 */}
        <div className="flex items-center justify-between p-5 border-b border-slate-700/50 bg-gradient-to-r from-cyan-900/20 to-blue-900/20">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Icon icon="material-symbols:route-outline" className="text-cyan-400 text-xl" />
              </div>
              {droneId} - 航线规划
            </h2>
            <p className="text-slate-400 text-sm mt-1 ml-13">规划和编辑无人机飞行航线</p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 hover:bg-slate-800 rounded-xl transition-all group"
          >
            <Icon icon="heroicons:x-mark" className="text-2xl text-slate-400 group-hover:text-slate-200" />
          </button>
        </div>

        {/* 内容区 */}
        <div className="flex-1 flex overflow-hidden relative">
          {/* 左侧控制面板 */}
          <div className="w-80 border-r border-slate-700/50 overflow-y-auto hide-scrollbar bg-slate-900/50">
            <div className="p-4 space-y-4">
              {/* 区域设置 */}
              <div className="space-y-3">
                <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Icon icon="heroicons:map" className="text-cyan-400" />
                  目标区域设置
                </div>
                <p className="text-xs text-slate-400">在地图上直接绘制或调整扫描区域</p>
                <button
                  onClick={() => {
                    // 可以在这里添加绘制模式的切换
                    alert('在地图上点击和拖动来绘制扫描区域');
                  }}
                  className="w-full rounded-lg border border-cyan-600 bg-cyan-600/20 py-2.5 text-sm font-medium text-cyan-400 transition hover:bg-cyan-600/30"
                >
                  在地图上绘制区域
                </button>
              </div>

              {/* 路线设置 */}
              <div className="space-y-3 pt-4 border-t border-slate-700/50">
                <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Icon icon="heroicons:map-pin" className="text-cyan-400" />
                  路线设置
                </div>
                <button
                  onClick={() => {
                    setIsPickingStart(true);
                    setIsPickingEnd(false);
                  }}
                  className={`w-full rounded-lg border py-2.5 text-sm font-medium transition ${
                    isPickingStart
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {isPickingStart ? '点击地图设置起飞点...' : '设置起飞点'}
                </button>
                <div className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs text-slate-400">
                  起飞点：{startPoint[0].toFixed(6)}, {startPoint[1].toFixed(6)}
                </div>
                <button
                  onClick={() => {
                    setIsPickingEnd(true);
                    setIsPickingStart(false);
                  }}
                  className={`w-full rounded-lg border py-2.5 text-sm font-medium transition ${
                    isPickingEnd
                      ? 'border-cyan-500 bg-cyan-500/20 text-cyan-400'
                      : 'border-slate-600 bg-slate-800 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  {isPickingEnd ? '点击地图设置降落点...' : '设置降落点'}
                </button>
                <div className="rounded-lg bg-slate-800/80 px-3 py-2 text-xs text-slate-400">
                  降落点：{endPoint ? `${endPoint[0].toFixed(6)}, ${endPoint[1].toFixed(6)}` : '未设置'}
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
                    className="flex-1 accent-cyan-500"
                  />
                  <span className="w-16 text-right text-sm font-medium text-cyan-400">{spacing}m</span>
                </div>
                <button
                  onClick={() => setDirection((d) => (d === 'horizontal' ? 'vertical' : 'horizontal'))}
                  className="w-full rounded-lg border border-slate-600 bg-slate-800 py-2 text-sm text-slate-300 hover:border-cyan-500 hover:text-cyan-400 transition"
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
                    className="w-20 rounded-lg border border-slate-600 bg-slate-800/80 px-2 py-1.5 text-right text-sm text-slate-200 outline-none focus:border-cyan-500"
                  />
                  <span className="text-sm text-slate-400">米</span>
                </div>
              </div>

              {/* 显示设置 */}
              <div className="space-y-3 pt-4 border-t border-slate-700/50">
                <div className="text-sm font-semibold text-slate-200 flex items-center gap-2">
                  <Icon icon="heroicons:eye" className="text-cyan-400" />
                  显示设置
                </div>
                <div className="flex gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={showPath}
                      onChange={(e) => setShowPath(e.target.checked)}
                      className="rounded border-slate-600 accent-cyan-500"
                    />
                    显示航线
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-400">
                    <input
                      type="checkbox"
                      checked={showWaypoints}
                      onChange={(e) => setShowWaypoints(e.target.checked)}
                      className="rounded border-slate-600 accent-cyan-500"
                    />
                    显示航点
                  </label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-400">模拟速度</span>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={speed}
                    onChange={(e) => setSpeed(Number(e.target.value))}
                    className="flex-1 accent-cyan-500"
                  />
                  <span className="text-sm font-medium text-cyan-400">{speed}倍</span>
                </div>
                <button
                  onClick={startSimulation}
                  className={`w-full rounded-lg py-2.5 text-sm font-bold transition ${
                    isSimulating
                      ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                      : 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30'
                  }`}
                >
                  {isSimulating ? '停止模拟' : '模拟飞行'}
                </button>
              </div>

              {/* 操作按钮 */}
              <div className="space-y-2 pt-4 border-t border-slate-700/50">
                <button
                  onClick={saveFlightPath}
                  className="w-full flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 py-3 text-sm font-bold text-white transition shadow-lg shadow-cyan-500/20 hover:shadow-cyan-500/40"
                >
                  <Icon icon="heroicons:check-circle" />
                  保存航线
                </button>
              </div>
            </div>
          </div>

          {/* 右侧地图 */}
          <div className="flex-1 flex flex-col relative">
            {/* 地图类型切换 */}
            <div className="absolute right-4 top-4 z-[100] flex gap-1 rounded-lg border border-slate-700/50 bg-slate-900/90 px-1 py-1 backdrop-blur">
              <button
                onClick={() => setMapType('normal')}
                className={`rounded px-3 py-1.5 text-sm transition ${
                  mapType === 'normal' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                道路地图
              </button>
              <button
                onClick={() => setMapType('satellite')}
                className={`rounded px-3 py-1.5 text-sm transition ${
                  mapType === 'satellite' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                影像地图
              </button>
            </div>

            {/* 航线信息 */}
            <div className="absolute bottom-4 right-4 z-[100] w-64 rounded-lg border border-slate-700/50 bg-slate-900/95 p-4 shadow-xl backdrop-blur">
              <div className="mb-3 text-sm font-semibold text-slate-200">航线信息</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>航线点数</span>
                  <span className="font-medium text-cyan-400">{flightData.path.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>航点数量</span>
                  <span className="font-medium text-cyan-400">{flightData.waypoints.length}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>航线间距</span>
                  <span className="font-medium text-cyan-400">{spacing}米</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>飞行高度</span>
                  <span className="font-medium text-cyan-400">{flightHeight}米</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>航线总长</span>
                  <span className="font-medium text-cyan-400">{totalLength.toLocaleString()}米</span>
                </div>
              </div>
            </div>

            {/* 地图容器 */}
            <div ref={containerRef} className="absolute inset-0" />
          </div>
        </div>
      </div>
    </div>
  );
}

