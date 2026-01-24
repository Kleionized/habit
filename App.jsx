import React, { useState, useMemo, useRef, useEffect } from 'react';
import { TrendingUp, Calendar, Zap, Activity, Clock, BarChart3, List, Target, Repeat, Settings2, Info } from 'lucide-react';

// --- UI Components (Notion/Shadcn style) ---

const Card = ({ children, className = "" }) => (
  <div className={`bg-white border border-slate-200 rounded-lg shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] overflow-hidden ${className}`}>
    {children}
  </div>
);

const PropertyRow = ({ icon: Icon, label, children }) => (
  <div className="flex items-center py-2 group">
    <div className="w-40 flex items-center text-sm text-slate-500 gap-2 shrink-0">
      <Icon size={14} className="text-slate-400" />
      <span>{label}</span>
    </div>
    <div className="flex-1">
      {children}
    </div>
  </div>
);

// --- Helper for compact numbers ---
const formatCompact = (num) => {
  if (num < 1000) return num.toFixed(2);
  const suffixes = ["", "k", "M", "B", "T", "Q"];
  const suffixNum = Math.floor(("" + Math.floor(num)).length / 3);
  
  if (suffixNum >= suffixes.length) return num.toExponential(2);
  
  let shortValue = parseFloat((suffixNum !== 0 ? (num / Math.pow(1000, suffixNum)) : num).toPrecision(3));
  if (shortValue % 1 !== 0) {
      shortValue = shortValue.toFixed(1);
  }
  return shortValue + suffixes[suffixNum];
};

// --- Chart Component ---
const CustomLineChart = ({ chartData, milestoneData, isLinearScale }) => {
  const [hoveredPoint, setHoveredPoint] = useState(null);
  const containerRef = useRef(null);
  const [dimensions, setDimensions] = useState({ width: 600, height: 300 });

  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight || 300
        });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!chartData || chartData.length === 0) return <div className="text-slate-400 text-sm">No Data Available</div>;

  const padding = { top: 20, right: 20, bottom: 30, left: 0 }; // Minimal padding
  const chartWidth = dimensions.width - padding.left - padding.right;
  const chartHeight = dimensions.height - padding.top - padding.bottom;

  const maxY = Math.max(...chartData.map(d => d.value));
  const minY = Math.min(...chartData.map(d => d.value));
  const maxDays = Math.max(...chartData.map(d => d.days));
  
  const getX = (days) => (days / maxDays) * chartWidth; 
  const getY = (value) => chartHeight - ((value - minY) / (maxY - minY || 1)) * chartHeight;

  const pointsString = chartData
    .map((d) => `${getX(d.days)},${getY(d.value)}`)
    .join(' ');

  const handleMouseMove = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left - padding.left;
    
    let nearest = null;
    let minDist = Infinity;

    // Snap to chart data points for smoother scrubbing
    chartData.forEach((d) => {
      const px = getX(d.days);
      const dist = Math.abs(px - mouseX);
      if (dist < minDist) {
        minDist = dist;
        nearest = d;
      }
    });

    if (nearest && minDist < 100) { 
      setHoveredPoint(nearest);
    } else {
      setHoveredPoint(null);
    }
  };

  // Dynamic tooltip positioning
  const getTooltipStyles = (point) => {
     const x = getX(point.days);
     const y = getY(point.value);
     
     let translateX = "-50%";
     let translateY = "-100%";
     let topPos = y - 12; // Default: Position above
     
     // Horizontal Boundary protection
     // If near left edge, shift origin left so tooltip moves right
     if (x < chartWidth * 0.2) translateX = "-5%"; 
     // If near right edge, shift origin right so tooltip moves left
     else if (x > chartWidth * 0.8) translateX = "-95%";
     
     // Vertical Boundary protection
     // If the point is very high up (y is small), shift tooltip DOWN below the point
     if (y < 60) {
        translateY = "0%";
        topPos = y + 12;
     }
     
     return {
        left: padding.left + x,
        top: padding.top + topPos,
        transform: `translate(${translateX}, ${translateY})`
     };
  };

  return (
    <div 
      className="relative w-full h-[350px] select-none group" 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setHoveredPoint(null)}
      onTouchMove={(e) => {
         const touch = e.touches[0];
         handleMouseMove(touch);
      }}
    >
      <svg width="100%" height="100%" className="overflow-visible">
        <g transform={`translate(${padding.left},${padding.top})`}>
          {/* Subtle Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = chartHeight - (tick * chartHeight);
            return (
              <line key={tick} x1="0" y1={y} x2={chartWidth} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            );
          })}

          {/* The Line */}
          <polyline
            points={pointsString}
            fill="none"
            stroke="#18181b" // Zinc-900
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />

          {/* Gradient Fill (Subtle) */}
          <defs>
            <linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#18181b" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#18181b" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polyline
            points={`0,${chartHeight} ${pointsString} ${getX(chartData[chartData.length-1].days)},${chartHeight}`}
            fill="url(#chartFill)"
            stroke="none"
          />

          {/* Interactive Cursor Line */}
          {hoveredPoint && (
            <line 
              x1={getX(hoveredPoint.days)} 
              y1={0} 
              x2={getX(hoveredPoint.days)} 
              y2={chartHeight} 
              stroke="#e2e8f0" 
              strokeWidth="1"
            />
          )}

          {/* Hover Dot */}
          {hoveredPoint && (
            <circle
              cx={getX(hoveredPoint.days)}
              cy={getY(hoveredPoint.value)}
              r={5}
              className="fill-white stroke-slate-900 stroke-2"
            />
          )}
        </g>
      </svg>

      {/* Popover Tooltip */}
      {hoveredPoint && (
        <div 
          className="absolute z-10 bg-slate-900 text-slate-50 text-xs rounded-md py-1.5 px-3 shadow-xl pointer-events-none whitespace-nowrap"
          style={getTooltipStyles(hoveredPoint)}
        >
          <div className="font-semibold mb-0.5">Day {Math.round(hoveredPoint.days)}</div>
          <div className="font-mono text-slate-300">
             {formatCompact(hoveredPoint.value)}x
             <span className="text-emerald-400 ml-2">+{formatCompact(hoveredPoint.percentage)}%</span>
          </div>
        </div>
      )}
      
      {/* Y-Axis Labels (Absolute positioned for clean look) */}
      <div className="absolute left-0 top-0 h-full w-full pointer-events-none flex flex-col justify-between pt-5 pb-[30px] pr-5 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="text-right text-[10px] text-slate-400 border-b border-dashed border-slate-200 w-full">{formatCompact(maxY)}x</div>
          <div className="text-right text-[10px] text-slate-400 border-b border-dashed border-slate-200 w-full">{formatCompact((maxY+minY)/2)}x</div>
          <div className="text-right text-[10px] text-slate-400 border-b border-dashed border-slate-200 w-full">{formatCompact(minY)}x</div>
      </div>
    </div>
  );
};


// --- Main Application ---

export default function App() {
  const [baseline, setBaseline] = useState(1); 
  const [dailyRate, setDailyRate] = useState(1.0); 
  const [frequency, setFrequency] = useState(7); 
  const [timeUnit, setTimeUnit] = useState('years'); 
  const [timeValue, setTimeValue] = useState(10);
  const [viewMode, setViewMode] = useState('chart'); // 'chart' or 'table'

  const timeLimits = {
      weeks: { min: 2, max: 52, label: 'Weeks' },
      months: { min: 1, max: 24, label: 'Months' },
      years: { min: 1, max: 30, label: 'Years' }
  };

  const handleUnitChange = (newUnit) => {
      setTimeUnit(newUnit);
      setTimeValue(timeLimits[newUnit].min);
  };

  const { tableData, chartData, finalValue, totalGrowth } = useMemo(() => {
    const r = dailyRate / 100;
    const eventsPerDay = frequency / 7;
    const calculate = (days) => {
      const effectiveEvents = days * eventsPerDay;
      const multiplier = baseline * Math.pow((1 + r), effectiveEvents);
      const percentage = ((multiplier - baseline) / baseline) * 100;
      return { days, value: multiplier, percentage };
    };

    let maxDays;
    if (timeUnit === 'weeks') maxDays = timeValue * 7;
    else if (timeUnit === 'months') maxDays = timeValue * 30;
    else maxDays = timeValue * 365;

    // Milestones
    let potentialMilestones = [];
    if (timeUnit === 'weeks') {
        for(let i=1; i<=maxDays; i++) potentialMilestones.push({ label: `Day ${i}`, days: i });
    } else if (timeUnit === 'months') {
        potentialMilestones.push({ label: 'Day 1', days: 1 });
        potentialMilestones.push({ label: '1 Week', days: 7 });
        for(let i=1; i<=timeValue; i++) potentialMilestones.push({ label: `Month ${i}`, days: i*30 });
    } else {
        potentialMilestones = [
            { label: 'Day 1', days: 1 }, 
            { label: '1 Week', days: 7 }, 
            { label: '2 Weeks', days: 14 },
            { label: '1 Month', days: 30 },
            { label: '3 Months', days: 90 }, 
            { label: '6 Months', days: 180 }, 
            { label: '9 Months', days: 270 },
            { label: '1 Year', days: 365 }, 
            { label: '2 Years', days: 365*2 }, 
            { label: '3 Years', days: 365*3 }, 
            { label: '5 Years', days: 365*5 },
            { label: '7 Years', days: 365*7 }, 
            { label: '10 Years', days: 365*10 }, 
            { label: '15 Years', days: 365*15 }, 
            { label: '20 Years', days: 365*20 },
            { label: '25 Years', days: 365*25 }, 
            { label: '30 Years', days: 365*30 }
        ];
    }

    let filteredMilestones = potentialMilestones
      .filter(m => m.days <= maxDays)
      .map(m => ({ ...m, ...calculate(m.days) }));

    const lastMilestone = filteredMilestones[filteredMilestones.length - 1];
    if (!lastMilestone || Math.abs(lastMilestone.days - maxDays) > 0.5) {
        filteredMilestones.push({ label: `End`, ...calculate(maxDays) });
    }

    // High Res Chart Data
    const chartPoints = [];
    const pointsCount = 150;
    for (let i = 0; i <= pointsCount; i++) {
        const d = (i / pointsCount) * maxDays;
        chartPoints.push(calculate(d));
    }

    return {
        tableData: filteredMilestones,
        chartData: chartPoints,
        finalValue: calculate(maxDays).value,
        totalGrowth: calculate(maxDays).percentage
    };
  }, [baseline, dailyRate, timeValue, timeUnit, frequency]);

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900 font-sans selection:bg-slate-200">
      <div className="max-w-3xl mx-auto py-12 px-6">
        
        {/* Centered Heading */}
        <div className="mb-10 text-center">
           <h1 className="text-4xl font-bold tracking-normal text-slate-900">Habit Visualizer</h1>
        </div>

        <div className="flex flex-col gap-12">
          
          {/* Properties Block (Controls) */}
          <section>
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 select-none">Properties</h3>
            <div className="space-y-0.5">
               {/* 1. Baseline */}
               <PropertyRow icon={Target} label="Starting Baseline">
                  <input 
                    type="number" 
                    value={baseline} 
                    onChange={(e) => setBaseline(Number(e.target.value))}
                    className="w-full bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-400 focus:ring-0 px-2 py-1 text-sm outline-none transition-colors"
                  />
               </PropertyRow>

               {/* 2. Improvement Rate */}
               <PropertyRow icon={Zap} label="Daily Improvement">
                  <div className="flex items-center gap-4 px-2">
                     <input 
                        type="range" 
                        min="0" max="5.0" step="0.1"
                        value={dailyRate} 
                        onChange={(e) => setDailyRate(Number(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                     />
                     <span className="text-sm font-mono text-slate-700 w-12 text-right">{dailyRate}%</span>
                  </div>
               </PropertyRow>

               {/* 3. Frequency */}
               <PropertyRow icon={Repeat} label="Frequency">
                  <div className="flex items-center gap-4 px-2">
                     <input 
                        type="range" 
                        min="1" max="7" step="1"
                        value={frequency} 
                        onChange={(e) => setFrequency(Number(e.target.value))}
                        className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-slate-900"
                     />
                     <span className="text-sm font-mono text-slate-700 w-16 text-right">
                        {frequency === 7 ? 'Daily' : `${frequency}d/wk`}
                     </span>
                  </div>
               </PropertyRow>

               {/* 4. Duration */}
               <PropertyRow icon={Calendar} label="Duration">
                  <div className="flex items-center gap-2 px-2">
                     <input 
                        type="number" 
                        value={timeValue} 
                        onChange={(e) => setTimeValue(Number(e.target.value))}
                        className="w-16 bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:border-slate-400"
                     />
                     <select 
                        value={timeUnit}
                        onChange={(e) => handleUnitChange(e.target.value)}
                        className="bg-transparent text-sm text-slate-600 focus:outline-none cursor-pointer hover:text-slate-900"
                     >
                        <option value="weeks">Weeks</option>
                        <option value="months">Months</option>
                        <option value="years">Years</option>
                     </select>
                  </div>
               </PropertyRow>
            </div>
          </section>

          <hr className="border-slate-200" />

          {/* Visualization Block */}
          <section>
             <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                   <h3 className="text-lg font-semibold text-slate-900">Trajectory</h3>
                   <span className="text-slate-300 text-sm">/</span>
                   <span className="text-slate-400 text-sm">Projection</span>
                </div>
                
                {/* View Toggle */}
                <div className="flex bg-slate-100 rounded-md p-0.5">
                   <button 
                      onClick={() => setViewMode('chart')}
                      className={`px-3 py-1 rounded-sm text-xs font-medium transition-all ${viewMode === 'chart' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                      Graph
                   </button>
                   <button 
                      onClick={() => setViewMode('table')}
                      className={`px-3 py-1 rounded-sm text-xs font-medium transition-all ${viewMode === 'table' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                   >
                      Data
                   </button>
                </div>
             </div>

             <Card className="min-h-[400px]">
                {viewMode === 'chart' ? (
                   <div className="p-6">
                      <CustomLineChart chartData={chartData} milestoneData={tableData} />
                      <div className="mt-4 text-center">
                         <p className="text-xs text-slate-400 max-w-md mx-auto">
                            The curve represents your skill level multiplier over time. Hover over the line to see specific daily values.
                         </p>
                      </div>
                   </div>
                ) : (
                   <div className="max-h-[400px] overflow-y-auto">
                      <table className="w-full text-sm text-left">
                         <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0 border-b border-slate-200">
                           <tr>
                             <th className="px-6 py-3 font-normal">Timeline</th>
                             <th className="px-6 py-3 font-normal text-right">Multiplier</th>
                             <th className="px-6 py-3 font-normal text-right">Gain</th>
                           </tr>
                         </thead>
                         <tbody className="divide-y divide-slate-100">
                           {tableData.map((row, i) => (
                             <tr key={i} className="hover:bg-slate-50 transition-colors">
                               <td className="px-6 py-3 text-slate-600 font-medium">{row.label}</td>
                               <td className="px-6 py-3 text-right text-slate-600 font-mono">{formatCompact(row.value)}x</td>
                               <td className="px-6 py-3 text-right">
                                  <span className="text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded text-xs">
                                     +{formatCompact(row.percentage)}%
                                  </span>
                               </td>
                             </tr>
                           ))}
                         </tbody>
                      </table>
                   </div>
                )}
             </Card>
          </section>

        </div>
      </div>
    </div>
  );
}
