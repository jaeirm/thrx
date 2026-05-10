import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, BarChart3, LineChart, PieChart, Settings2, Sparkles } from 'lucide-react';
import { 
    LineChart as RechartsLineChart, 
    Line, 
    BarChart as RechartsBarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart as RechartsPie,
    Pie,
    Cell
} from 'recharts';

interface DataVizDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    data: any[] | null;
    fileName?: string;
    onAnalyzeChart?: (prompt: string) => void;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

export const DataVizDrawer: React.FC<DataVizDrawerProps> = ({ isOpen, onClose, data, fileName, onAnalyzeChart }) => {
    const [chartType, setChartType] = useState<'line' | 'bar' | 'pie'>('line');
    const [showConfig, setShowConfig] = useState(false);
    const [selectedDataPoint, setSelectedDataPoint] = useState<any>(null);
    
    // Resizing state
    const [drawerWidth, setDrawerWidth] = useState(400);
    const [isDragging, setIsDragging] = useState(false);

    // User configuration state
    const [selectedXAxis, setSelectedXAxis] = useState<string>('');
    const [selectedYAxes, setSelectedYAxes] = useState<string[]>([]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const newWidth = window.innerWidth - e.clientX;
            if (newWidth >= 300 && newWidth <= 800) {
                setDrawerWidth(newWidth);
            }
        };
        const handleMouseUp = () => setIsDragging(false);

        if (isDragging) {
            document.body.style.userSelect = 'none';
            document.body.style.cursor = 'col-resize';
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        } else {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
        }
        
        return () => {
            document.body.style.userSelect = '';
            document.body.style.cursor = '';
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    // Auto-detect columns
    const chartConfig = useMemo(() => {
        if (!data || data.length === 0) return null;
        
        const sampleRow = data[0];
        const keys = Object.keys(sampleRow);
        
        let xAxisKey = '';
        const yAxisKeys: string[] = [];

        // Simple heuristic: first string/date column is X, all numeric are Y
        keys.forEach(key => {
            const val = sampleRow[key];
            if (typeof val === 'number') {
                yAxisKeys.push(key);
            } else if (!xAxisKey && (typeof val === 'string' || val instanceof Date)) {
                xAxisKey = key;
            }
        });

        // Fallbacks
        if (!xAxisKey && keys.length > 0) {
            xAxisKey = keys[0]; // Just use first column if no strings
        }
        
        // If no explicit numerics, maybe try parsing them, but for now just use what we found
        if (yAxisKeys.length === 0 && keys.length > 1) {
            yAxisKeys.push(keys[1]);
        }

        return { xAxisKey, yAxisKeys, allKeys: keys };
    }, [data]);

    // Initialize user config when data loads
    useEffect(() => {
        if (chartConfig) {
            if (!selectedXAxis || !chartConfig.allKeys.includes(selectedXAxis)) {
                setSelectedXAxis(chartConfig.xAxisKey);
            }
            if (selectedYAxes.length === 0 || !selectedYAxes.every(k => chartConfig.allKeys.includes(k))) {
                setSelectedYAxes(chartConfig.yAxisKeys);
            }
        }
    }, [chartConfig, data]);

    const handleYAxisToggle = (key: string) => {
        setSelectedDataPoint(null);
        setSelectedYAxes(prev => 
            prev.includes(key) 
                ? prev.filter(k => k !== key) 
                : [...prev, key]
        );
    };

    const handleAnalyze = () => {
        if (onAnalyzeChart && selectedXAxis && selectedYAxes.length > 0) {
            let prompt = `Please analyze the attached dataset focusing on the relationship between ${selectedYAxes.join(', ')} over ${selectedXAxis}. Provide insights and identify any notable trends.`;
            
            if (selectedDataPoint) {
                prompt = `Please analyze this specific data point from the chart:\n\n**${selectedXAxis}**: ${selectedDataPoint[selectedXAxis]}\n${selectedYAxes.map(y => `**${y}**: ${selectedDataPoint[y]}`).join('\n')}\n\nExplain what might have caused this specific value or trend in the context of the overall dataset.`;
            }
            
            onAnalyzeChart(prompt);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: drawerWidth, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={isDragging ? { duration: 0 } : { type: 'spring', damping: 25, stiffness: 200 }}
                    className="h-full relative border-l border-border bg-background/95 backdrop-blur-md shadow-2xl flex flex-col z-40 overflow-hidden"
                >
                    {/* Drag Handle */}
                    <div 
                        onMouseDown={(e) => {
                            e.preventDefault();
                            setIsDragging(true);
                        }}
                        className={`absolute left-0 top-0 bottom-0 w-1.5 cursor-col-resize hover:bg-primary/50 transition-colors z-50 flex items-center justify-center group ${isDragging ? 'bg-primary/50' : 'bg-transparent'}`}
                    >
                        <div className={`h-12 w-0.5 rounded-full transition-colors ${isDragging ? 'bg-white/80' : 'bg-white/20 group-hover:bg-white/50'}`} />
                    </div>

                    <div className="flex items-center justify-between p-4 border-b border-white/5 pl-6">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="text-primary w-5 h-5" />
                            <h2 className="font-semibold text-sm truncate max-w-[250px]">
                                {fileName || 'Data Visualization'}
                            </h2>
                        </div>
                        <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-md transition-colors text-muted-foreground hover:text-foreground">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-6">
                        {!data || data.length === 0 ? (
                            <div className="text-center text-muted-foreground text-sm mt-10">
                                No visualizable data found in this document.
                            </div>
                        ) : !selectedYAxes.length ? (
                            <div className="text-center text-muted-foreground text-sm mt-10">
                                Please select at least one Y-Axis metric to plot.
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <div className="flex bg-black/20 p-1 rounded-lg gap-1 border border-white/5 w-fit">
                                        <button
                                            onClick={() => setChartType('line')}
                                            className={`p-1.5 rounded-md transition-all ${chartType === 'line' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                                            title="Line Chart"
                                        >
                                            <LineChart className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setChartType('bar')}
                                            className={`p-1.5 rounded-md transition-all ${chartType === 'bar' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                                            title="Bar Chart"
                                        >
                                            <BarChart3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => setChartType('pie')}
                                            className={`p-1.5 rounded-md transition-all ${chartType === 'pie' ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-white/5'}`}
                                            title="Pie Chart"
                                        >
                                            <PieChart className="w-4 h-4" />
                                        </button>
                                    </div>
                                    <button 
                                        onClick={() => setShowConfig(!showConfig)}
                                        className={`flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-md border transition-all ${showConfig ? 'bg-primary/20 border-primary/30 text-primary' : 'bg-secondary border-white/5 text-muted-foreground hover:text-foreground hover:bg-white/5'}`}
                                    >
                                        <Settings2 className="w-3.5 h-3.5" />
                                        Configure
                                    </button>
                                </div>

                                <AnimatePresence>
                                    {showConfig && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden"
                                        >
                                            <div className="bg-black/20 border border-white/5 rounded-xl p-4 space-y-4 mb-2">
                                                <div>
                                                    <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">X-Axis (Category/Date)</label>
                                                    <select 
                                                        value={selectedXAxis}
                                                        onChange={(e) => setSelectedXAxis(e.target.value)}
                                                        className="w-full bg-secondary border border-white/10 rounded-md text-xs p-1.5 outline-none focus:border-primary/50 text-foreground"
                                                    >
                                                        {chartConfig?.allKeys.map(key => (
                                                            <option key={key} value={key}>{key}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-foreground/80 mb-1.5 block">Y-Axis (Metrics)</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {chartConfig?.allKeys.filter(k => k !== selectedXAxis).map(key => (
                                                            <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer bg-white/5 hover:bg-white/10 px-2 py-1 rounded-md border border-white/5 transition-colors">
                                                                <input 
                                                                    type="checkbox" 
                                                                    checked={selectedYAxes.includes(key)}
                                                                    onChange={() => handleYAxisToggle(key)}
                                                                    className="accent-primary w-3 h-3 cursor-pointer"
                                                                />
                                                                <span className={selectedYAxes.includes(key) ? 'text-foreground' : 'text-muted-foreground'}>{key}</span>
                                                            </label>
                                                        ))}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>

                                <div className="h-[300px] w-full bg-black/20 border border-white/5 rounded-xl p-4 cursor-pointer">
                                    <ResponsiveContainer width="100%" height="100%">
                                        {chartType === 'line' ? (
                                            <RechartsLineChart 
                                                data={data} 
                                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                                onClick={(e) => {
                                                    if (e && e.activePayload && e.activePayload.length > 0) {
                                                        setSelectedDataPoint(e.activePayload[0].payload);
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey={selectedXAxis} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                                                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                                {selectedYAxes.map((key, i) => (
                                                    <Line type="monotone" key={key} dataKey={key} stroke={COLORS[i % COLORS.length]} activeDot={{ r: 6 }} strokeWidth={2} />
                                                ))}
                                            </RechartsLineChart>
                                        ) : chartType === 'bar' ? (
                                            <RechartsBarChart 
                                                data={data} 
                                                margin={{ top: 5, right: 5, left: -20, bottom: 5 }}
                                                onClick={(e) => {
                                                    if (e && e.activePayload && e.activePayload.length > 0) {
                                                        setSelectedDataPoint(e.activePayload[0].payload);
                                                    }
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                                                <XAxis dataKey={selectedXAxis} stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                                                <YAxis stroke="rgba(255,255,255,0.5)" tick={{ fontSize: 10 }} />
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                    itemStyle={{ color: '#fff' }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                                {selectedYAxes.map((key, i) => (
                                                    <Bar key={key} dataKey={key} fill={COLORS[i % COLORS.length]} radius={[4, 4, 0, 0]} />
                                                ))}
                                            </RechartsBarChart>
                                        ) : (
                                            <RechartsPie data={data}>
                                                <Tooltip 
                                                    contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }}
                                                />
                                                <Legend wrapperStyle={{ fontSize: '12px' }} />
                                                <Pie
                                                    data={data}
                                                    dataKey={selectedYAxes[0]} // Use first numeric for pie
                                                    nameKey={selectedXAxis}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={60}
                                                    outerRadius={90}
                                                    paddingAngle={2}
                                                    onClick={(entry) => {
                                                        setSelectedDataPoint(entry.payload || entry);
                                                    }}
                                                >
                                                    {data.map((_, index) => (
                                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                    ))}
                                                </Pie>
                                            </RechartsPie>
                                        )}
                                    </ResponsiveContainer>
                                </div>
                                
                                {selectedDataPoint && (
                                    <div className="bg-primary/10 border border-primary/20 p-3 rounded-xl flex items-start justify-between text-sm mt-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="font-semibold text-primary">{selectedDataPoint[selectedXAxis]}</span>
                                            <span className="text-foreground/80 text-xs">
                                                {selectedYAxes.map(y => `${y}: ${selectedDataPoint[y]}`).join(' | ')}
                                            </span>
                                        </div>
                                        <button onClick={() => setSelectedDataPoint(null)} className="text-primary hover:text-primary/70 bg-primary/10 p-1 rounded-md transition-colors">
                                            <X className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                )}

                                {onAnalyzeChart && (
                                    <button 
                                        onClick={handleAnalyze}
                                        className="w-full flex items-center justify-center gap-2 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 border border-indigo-500/20 p-3 rounded-xl transition-all shadow-sm font-medium text-sm mt-2"
                                    >
                                        <Sparkles className="w-4 h-4" />
                                        {selectedDataPoint ? 'Ask AI to Analyze Selected Point' : 'Ask AI to Analyze Chart'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
