import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  BarChart3,
  Calendar,
  Clock,
  List,
  Repeat,
  Target,
  TrendingUp,
  Zap
} from 'lucide-react';

const SectionCard = ({ children, className = '' }) => (
  <div className={`glass-panel rounded-2xl p-6 ${className}`}>{children}</div>
);

const MetricCard = ({ icon: Icon, label, value, accent = 'text-ink' }) => (
  <div className="rounded-xl border border-white/70 bg-white/80 p-4 shadow-sm">
    <div className="flex items-center justify-between text-xs uppercase tracking-wider text-slate-400">
      <span>{label}</span>
      {Icon ? <Icon size={14} className="text-slate-400" /> : null}
    </div>
    <div className={`mt-2 text-2xl font-display ${accent}`}>{value}</div>
  </div>
);

const ControlGroup = ({ icon: Icon, label, children }) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
      {Icon ? <Icon size={16} className="text-slate-500" /> : null}
      <span>{label}</span>
    </div>
    {children}
  </div>
);

const ToggleButton = ({ active, onClick, icon: Icon, label }) => (
  <button
    type="button"
    onClick={onClick}
    className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition ${
      active
        ? 'bg-ink text-white shadow-sm'
        : 'text-slate-500 hover:text-slate-700'
    }`}
  >
    {Icon ? <Icon size={14} /> : null}
    {label}
  </button>
);

const formatCompact = (num) => {
  if (!Number.isFinite(num)) return '--';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);
  if (abs < 1000) return `${sign}${abs.toFixed(abs < 10 ? 2 : 1)}`;
  const suffixes = ['', 'k', 'M', 'B', 'T'];
  const magnitude = Math.min(suffixes.length - 1, Math.floor(Math.log10(abs) / 3));
  const shortValue = abs / Math.pow(1000, magnitude);
  return `${sign}${shortValue.toFixed(shortValue < 10 ? 2 : 1)}${suffixes[magnitude]}`;
};

const formatDuration = (days) => {
  if (!Number.isFinite(days)) return 'Not in range';
  if (days < 7) return `${Math.round(days)} days`;
  if (days < 60) return `${(days / 7).toFixed(1)} weeks`;
  if (days < 365) return `${(days / 30).toFixed(1)} months`;
  return `${(days / 365).toFixed(1)} years`;
};

const CustomLineChart = ({ chartData, milestoneData }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 320 });

  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setDimensions({ width, height });
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  if (!chartData || chartData.length === 0) {
    return <div className="text-sm text-slate-400">No data available</div>;
  }

  const padding = { top: 24, right: 20, bottom: 32, left: 36 };
  const chartWidth = Math.max(0, dimensions.width - padding.left - padding.right);
  const chartHeight = Math.max(0, dimensions.height - padding.top - padding.bottom);

  const maxY = Math.max(...chartData.map((d) => d.value));
  const minY = Math.min(...chartData.map((d) => d.value));
  const maxDays = Math.max(...chartData.map((d) => d.days));
  const rangeY = maxY - minY || 1;

  const getX = (days) => (days / maxDays) * chartWidth;
  const getY = (value) => chartHeight - ((value - minY) / rangeY) * chartHeight;

  const linePath = chartData
    .map((d, index) => `${index === 0 ? 'M' : 'L'} ${getX(d.days)} ${getY(d.value)}`)
    .join(' ');
  const lastPoint = chartData[chartData.length - 1];
  const fillPath = `${linePath} L ${getX(lastPoint.days)} ${chartHeight} L 0 ${chartHeight} Z`;

  const markerPoints = useMemo(() => {
    if (!milestoneData || milestoneData.length === 0) return [];
    const maxMarkers = 12;
    if (milestoneData.length <= maxMarkers) return milestoneData;
    const step = Math.ceil(milestoneData.length / maxMarkers);
    return milestoneData.filter((_, index) => index % step === 0);
  }, [milestoneData]);

  const handlePointerMove = (clientX) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = clientX - rect.left - padding.left;

    let nearest = null;
    let minDist = Infinity;

    chartData.forEach((d) => {
      const px = getX(d.days);
      const dist = Math.abs(px - mouseX);
      if (dist < minDist) {
        minDist = dist;
        nearest = d;
      }
    });

    if (nearest && minDist < 90) {
      setHoveredPoint(nearest);
    } else {
      setHoveredPoint(null);
    }
  };

  const tooltipStyle = (point) => {
    const x = getX(point.days);
    const y = getY(point.value);

    let translateX = '-50%';
    let translateY = '-100%';
    let topPos = y - 12;

    if (x < chartWidth * 0.2) translateX = '-5%';
    else if (x > chartWidth * 0.8) translateX = '-95%';

    if (y < 60) {
      translateY = '0%';
      topPos = y + 16;
    }

    return {
      left: padding.left + x,
      top: padding.top + topPos,
      transform: `translate(${translateX}, ${translateY})`
    };
  };

  return (
    <div
      className="relative h-[320px] w-full select-none"
      ref={containerRef}
      onMouseMove={(e) => handlePointerMove(e.clientX)}
      onMouseLeave={() => setHoveredPoint(null)}
      onTouchMove={(e) => handlePointerMove(e.touches[0].clientX)}
      onTouchEnd={() => setHoveredPoint(null)}
    >
      <svg width="100%" height="100%">
        <g transform={`translate(${padding.left},${padding.top})`}>
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartHeight - tick * chartHeight;
            return (
              <line
                key={tick}
                x1="0"
                y1={y}
                x2={chartWidth}
                y2={y}
                stroke="rgba(148,163,184,0.25)"
                strokeWidth="1"
              />
            );
          })}

          <defs>
            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(249, 115, 22, 0.25)" />
              <stop offset="100%" stopColor="rgba(249, 115, 22, 0)" />
            </linearGradient>
          </defs>

          <path d={fillPath} fill="url(#chartFill)" stroke="none" />
          <path
            d={linePath}
            fill="none"
            stroke="#f97316"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          {markerPoints.map((point, index) => (
            <circle
              key={`${point.label}-${index}`}
              cx={getX(point.days)}
              cy={getY(point.value)}
              r={3.5}
              fill="white"
              stroke="rgba(15,23,42,0.2)"
              strokeWidth="1.5"
            />
          ))}

          {hoveredPoint ? (
            <>
              <line
                x1={getX(hoveredPoint.days)}
                y1={0}
                x2={getX(hoveredPoint.days)}
                y2={chartHeight}
                stroke="rgba(148,163,184,0.5)"
                strokeWidth="1"
              />
              <circle
                cx={getX(hoveredPoint.days)}
                cy={getY(hoveredPoint.value)}
                r={5}
                fill="#ffffff"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </>
          ) : null}
        </g>
      </svg>

      {hoveredPoint ? (
        <div
          className="absolute z-10 rounded-md bg-slate-900 px-3 py-2 text-xs text-slate-50 shadow-xl"
          style={tooltipStyle(hoveredPoint)}
        >
          <div className="font-semibold">Day {Math.round(hoveredPoint.days)}</div>
          <div className="font-mono text-slate-200">
            {formatCompact(hoveredPoint.value)}x
            <span className="ml-2 text-amber-300">
              +{formatCompact(hoveredPoint.percentage)}%
            </span>
          </div>
        </div>
      ) : null}

      <div className="pointer-events-none absolute left-0 top-0 flex h-full w-full flex-col justify-between pb-[32px] pt-5">
        <div className="text-right text-[10px] text-slate-400">{formatCompact(maxY)}x</div>
        <div className="text-right text-[10px] text-slate-400">
          {formatCompact((maxY + minY) / 2)}x
        </div>
        <div className="text-right text-[10px] text-slate-400">{formatCompact(minY)}x</div>
      </div>
    </div>
  );
};

const MilestoneTable = ({ rows }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200/70">
    <div className="max-h-72 overflow-auto">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 bg-slate-50/90 text-slate-500">
          <tr>
            <th className="px-4 py-3 font-medium">Timeline</th>
            <th className="px-4 py-3 text-right font-medium">Multiplier</th>
            <th className="px-4 py-3 text-right font-medium">Gain</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, i) => (
            <tr key={`${row.label}-${i}`} className="transition hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-600">{row.label}</td>
              <td className="px-4 py-3 text-right font-mono text-slate-600">
                {formatCompact(row.value)}x
              </td>
              <td className="px-4 py-3 text-right">
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-xs text-emerald-700">
                  +{formatCompact(row.percentage)}%
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

export default function App() {
  const [baseline, setBaseline] = useState(1);
  const [dailyRate, setDailyRate] = useState(1.0);
  const [frequency, setFrequency] = useState(5);
  const [timeUnit, setTimeUnit] = useState('years');
  const [timeValue, setTimeValue] = useState(5);
  const [viewMode, setViewMode] = useState('chart');

  const timeLimits = {
    weeks: { min: 2, max: 52, label: 'Weeks' },
    months: { min: 1, max: 24, label: 'Months' },
    years: { min: 1, max: 30, label: 'Years' }
  };

  const clampTimeValue = (value, unit) => {
    const { min, max } = timeLimits[unit];
    if (!Number.isFinite(value)) return min;
    return Math.min(Math.max(value, min), max);
  };

  const handleUnitChange = (newUnit) => {
    setTimeUnit(newUnit);
    setTimeValue(timeLimits[newUnit].min);
  };

  const resetDefaults = () => {
    setBaseline(1);
    setDailyRate(1.0);
    setFrequency(5);
    setTimeUnit('years');
    setTimeValue(5);
  };

  const {
    tableData,
    chartData,
    finalValue,
    totalSessions,
    doublingDay
  } = useMemo(() => {
    const baselineValue = Math.max(0.1, baseline || 1);
    const r = dailyRate / 100;
    const events = frequency / 7;

    let max;
    if (timeUnit === 'weeks') max = timeValue * 7;
    else if (timeUnit === 'months') max = timeValue * 30;
    else max = timeValue * 365;

    const calculate = (days) => {
      const effectiveEvents = days * events;
      const multiplier = baselineValue * Math.pow(1 + r, effectiveEvents);
      const percentage = ((multiplier - baselineValue) / baselineValue) * 100;
      return { days, value: multiplier, percentage };
    };

    let milestones = [{ label: 'Start', days: 0 }];

    if (timeUnit === 'weeks') {
      for (let i = 1; i <= max; i += 1) {
        milestones.push({ label: `Day ${i}`, days: i });
      }
    } else if (timeUnit === 'months') {
      milestones = [
        ...milestones,
        { label: 'Day 1', days: 1 },
        { label: '1 Week', days: 7 },
        ...Array.from({ length: timeValue }, (_, i) => ({
          label: `Month ${i + 1}`,
          days: (i + 1) * 30
        }))
      ];
    } else {
      milestones = [
        ...milestones,
        { label: 'Day 1', days: 1 },
        { label: '1 Week', days: 7 },
        { label: '2 Weeks', days: 14 },
        { label: '1 Month', days: 30 },
        { label: '3 Months', days: 90 },
        { label: '6 Months', days: 180 },
        { label: '9 Months', days: 270 },
        { label: '1 Year', days: 365 },
        { label: '2 Years', days: 365 * 2 },
        { label: '3 Years', days: 365 * 3 },
        { label: '5 Years', days: 365 * 5 },
        { label: '7 Years', days: 365 * 7 },
        { label: '10 Years', days: 365 * 10 },
        { label: '15 Years', days: 365 * 15 },
        { label: '20 Years', days: 365 * 20 },
        { label: '25 Years', days: 365 * 25 },
        { label: '30 Years', days: 365 * 30 }
      ];
    }

    const filteredMilestones = milestones
      .filter((m) => m.days <= max)
      .map((m) => ({ ...m, ...calculate(m.days) }));

    const lastMilestone = filteredMilestones[filteredMilestones.length - 1];
    if (!lastMilestone || Math.abs(lastMilestone.days - max) > 0.5) {
      filteredMilestones.push({ label: 'End', ...calculate(max) });
    }

    const pointsCount = 160;
    const chartPoints = [];
    for (let i = 0; i <= pointsCount; i += 1) {
      const d = (i / pointsCount) * max;
      chartPoints.push(calculate(d));
    }

    let daysToDouble = null;
    if (r > 0 && events > 0) {
      const computed = Math.log(2) / (events * Math.log(1 + r));
      if (computed <= max) daysToDouble = computed;
    }

    return {
      tableData: filteredMilestones,
      chartData: chartPoints,
      finalValue: calculate(max).value,
      totalSessions: Math.round(max * events),
      doublingDay: daysToDouble
    };
  }, [baseline, dailyRate, frequency, timeUnit, timeValue]);

  return (
    <div className="min-h-screen">
      <main className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-6 py-12 lg:py-16">
        <header className="flex items-center justify-between gap-4">
          <h1 className="text-3xl font-display tracking-tight text-slate-900 sm:text-4xl">
            Habit Visualizer
          </h1>
          <button
            type="button"
            onClick={resetDefaults}
            className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-semibold uppercase tracking-wider text-slate-600 transition hover:text-slate-900"
          >
            Reset
          </button>
        </header>

        <section className="grid gap-8 lg:grid-cols-[340px_1fr]">
          <SectionCard className="space-y-5 p-5">

            <ControlGroup icon={Target} label="Starting baseline">
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={baseline}
                  onChange={(e) => setBaseline(Math.max(0.1, Number(e.target.value) || 0.1))}
                  className="w-full rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                />
            </ControlGroup>

            <ControlGroup icon={Zap} label="Daily improvement">
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={dailyRate}
                  onChange={(e) => setDailyRate(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-orange-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>0%</span>
                  <span>5%</span>
                </div>
            </ControlGroup>

            <ControlGroup icon={Repeat} label="Practice frequency">
                <input
                  type="range"
                  min="1"
                  max="7"
                  step="1"
                  value={frequency}
                  onChange={(e) => setFrequency(Number(e.target.value))}
                  className="h-2 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-orange-500"
                />
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>1x</span>
                  <span>7x</span>
                </div>
            </ControlGroup>

            <ControlGroup icon={Calendar} label="Time horizon">
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={timeLimits[timeUnit].min}
                    max={timeLimits[timeUnit].max}
                    value={timeValue}
                    onChange={(e) => setTimeValue(clampTimeValue(Number(e.target.value), timeUnit))}
                    className="w-20 rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                  />
                  <select
                    value={timeUnit}
                    onChange={(e) => handleUnitChange(e.target.value)}
                    className="rounded-lg border border-slate-200/70 bg-white/80 px-3 py-2 text-sm text-slate-700 focus:border-slate-400 focus:outline-none"
                  >
                    <option value="weeks">Weeks</option>
                    <option value="months">Months</option>
                    <option value="years">Years</option>
                  </select>
                </div>
            </ControlGroup>

          </SectionCard>

          <div className="flex flex-col gap-6">
            <SectionCard className="space-y-6">
              <div className="flex items-center justify-end">
                <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/70 p-1">
                  <ToggleButton
                    active={viewMode === 'chart'}
                    onClick={() => setViewMode('chart')}
                    icon={BarChart3}
                    label="Graph"
                  />
                  <ToggleButton
                    active={viewMode === 'table'}
                    onClick={() => setViewMode('table')}
                    icon={List}
                    label="Milestones"
                  />
                </div>
              </div>

              {viewMode === 'chart' ? (
                <CustomLineChart chartData={chartData} milestoneData={tableData} />
              ) : (
                <MilestoneTable rows={tableData} />
              )}
            </SectionCard>

            <div className="grid gap-4 md:grid-cols-3">
              <MetricCard
                icon={TrendingUp}
                label="Final multiplier"
                value={`${formatCompact(finalValue)}x`}
                accent="text-slate-900"
              />
              <MetricCard
                icon={Activity}
                label="Total sessions"
                value={formatCompact(totalSessions)}
                accent="text-slate-900"
              />
              <MetricCard
                icon={Clock}
                label="Time to double"
                value={formatDuration(doublingDay)}
                accent="text-emerald-600"
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
