import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { AxisDefinition, CellData, Coordinate, GridMatrix } from './types';
import { SOURCE_LEVELS, X_AXIS, Y_AXIS, Z_AXIS, DEFAULT_SUBJECT, PROMPT_SUFFIX } from './constants';
import { generateImage, generateCharacterDescription } from './services/geminiService';
import { GridCell } from './components/GridCell';
import { 
  Box, 
  Layers, 
  Zap, 
  Palette, 
  Play, 
  RotateCcw, 
  Download,
  Info,
  RefreshCw,
  Square,
  Settings,
  Grid3X3,
  LayoutGrid,
  Boxes
} from 'lucide-react';
import { Grid3DView } from './components/Grid3DView';

// drastically reduced concurrency to avoid 429
const MAX_CONCURRENT_REQUESTS = 1;

interface AxisConfig {
  x: number;
  y: number;
  z: number;
}

const App: React.FC = () => {
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [axisConfig, setAxisConfig] = useState<AxisConfig>({ x: 5, y: 5, z: 5 });
  const [zLevel, setZLevel] = useState(0); // Current visible slice (Z-axis)
  const [gridData, setGridData] = useState<GridMatrix>({});
  const [queue, setQueue] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);
  const [selectedCellId, setSelectedCellId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [viewMode, setViewMode] = useState<'2d' | '3d'>('2d');

  // Helper to map a grid index (e.g. 0, 1, 2) to the source data index (0, 2, 4)
  const mapIndexToDataLevel = useCallback((index: number, totalSteps: number) => {
    if (totalSteps <= 1) return 0;
    // Map linear range [0, totalSteps-1] to [0, SOURCE_LEVELS-1]
    return Math.round(index * (SOURCE_LEVELS - 1) / (totalSteps - 1));
  }, []);

  // Initialize grid structure whenever axisConfig changes
  useEffect(() => {
    setQueue([]); // Clear queue on resize
    setProcessing(false);
    
    // Ensure zLevel is valid for new config
    if (zLevel >= axisConfig.z) {
      setZLevel(axisConfig.z - 1);
    }

    const initialGrid: GridMatrix = {};
    for (let z = 0; z < axisConfig.z; z++) {
      for (let y = 0; y < axisConfig.y; y++) {
        for (let x = 0; x < axisConfig.x; x++) {
          const id = `${x}-${y}-${z}`;
          initialGrid[id] = {
            id,
            coord: { x, y, z },
            prompt: '',
            status: 'idle'
          };
        }
      }
    }
    setGridData(initialGrid);
  }, [axisConfig]); // eslint-disable-line react-hooks/exhaustive-deps

  // Construct prompt for a specific cell
  const getPromptForCell = useCallback((coord: Coordinate, subj: string, includeAxisDetails: boolean = true) => {
    const xLevel = mapIndexToDataLevel(coord.x, axisConfig.x);
    const yLevel = mapIndexToDataLevel(coord.y, axisConfig.y);
    const zLevel = mapIndexToDataLevel(coord.z, axisConfig.z);

    // If we have a generated character description, we don't need the axis details
    // since they've already been "baked into" the character description
    if (!includeAxisDetails) {
      return `${subj}. ${PROMPT_SUFFIX}`;
    }

    return `${subj}. 
    Style: ${X_AXIS.levels[xLevel]}. 
    Pose/Energy: ${Y_AXIS.levels[yLevel]}. 
    Physical details: ${Z_AXIS.levels[zLevel]}. 
    ${PROMPT_SUFFIX}`;
  }, [axisConfig, mapIndexToDataLevel]);

  // Queue Processor
  useEffect(() => {
    if (!processing && queue.length > 0) {
      processQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queue, processing]);

  const processQueue = async () => {
    setProcessing(true);
    
    // Take batch (Strictly 1 for safety now)
    const batchIds = queue.slice(0, MAX_CONCURRENT_REQUESTS);
    const remainingQueue = queue.slice(MAX_CONCURRENT_REQUESTS);

    setQueue(remainingQueue);

    // Mark as loading visually
    setGridData(prev => {
      const next = { ...prev };
      batchIds.forEach(id => {
        if (next[id]) {
          next[id] = { ...next[id], status: 'loading' };
        }
      });
      return next;
    });

    for (const id of batchIds) {
      const cell = gridData[id];
      if (!cell) continue;
      
      // Get the dimension descriptions for this cell
      const xLevel = mapIndexToDataLevel(cell.coord.x, axisConfig.x);
      const yLevel = mapIndexToDataLevel(cell.coord.y, axisConfig.y);
      const zLevelIdx = mapIndexToDataLevel(cell.coord.z, axisConfig.z);

      try {
        // Step 1: Generate character description using text LLM
        let characterDesc = subject; // Default fallback
        let useGeneratedCharacter = false;
        
        // Only generate character description if subject is empty or default
        if (!subject.trim() || subject === DEFAULT_SUBJECT) {
          console.log(`Generating character for cell ${id}...`);
          characterDesc = await generateCharacterDescription(
            X_AXIS.levels[xLevel],
            Y_AXIS.levels[yLevel],
            Z_AXIS.levels[zLevelIdx]
          );
          console.log(`Character generated: ${characterDesc}`);
          useGeneratedCharacter = true;
          
          // Add delay after text generation to respect rate limits
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Step 2: Build the full prompt with the character description
        // If we generated the character from axes, don't include axis details again
        const prompt = getPromptForCell(cell.coord, characterDesc, !useGeneratedCharacter);

        // Step 3: Generate the image
        const base64Image = await generateImage(prompt);
        setGridData(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            imageUrl: base64Image,
            prompt: prompt,
            characterDescription: characterDesc,
            status: 'success'
          }
        }));
        
        // IMPORTANT: 4 second delay between successful requests to stay within ~15 RPM limit
        await new Promise(resolve => setTimeout(resolve, 4000));

      } catch (error: any) {
        console.error("Gen Error for cell", id, error);
        
        const isRateLimit = JSON.stringify(error).includes('429') || error.status === 429 || error?.message?.includes('429');
        
        setGridData(prev => ({
          ...prev,
          [id]: {
            ...prev[id],
            status: 'error'
          }
        }));

        if (isRateLimit) {
            console.warn("429 Rate Limit Hit. Pausing for 30 seconds to cooldown.");
            // Penalty delay to allow quota bucket to refill
            await new Promise(resolve => setTimeout(resolve, 30000));
        } else {
            // Standard small delay for other errors
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    setProcessing(false);
  };

  const addToQueue = (ids: string[]) => {
    // Filter duplicates
    const uniqueIds = Array.from(new Set([...queue, ...ids]));
    setQueue(uniqueIds);
    
    // Mark added items as Queued immediately for feedback
    setGridData(prev => {
        const next = {...prev};
        ids.forEach(id => {
            if(next[id] && next[id].status !== 'success' && next[id].status !== 'loading') {
                next[id].status = 'queued';
            }
        });
        return next;
    });
  };

  const handleStop = () => {
    // Clear the queue to stop future processing
    setQueue([]);
    
    // Reset visually queued items back to idle
    setGridData(prev => {
        const next = {...prev};
        Object.keys(next).forEach(k => {
            if(next[k].status === 'queued') {
                next[k].status = 'idle';
            }
        });
        return next;
    });
  };

  const handleGenerateSlice = () => {
    const ids: string[] = [];
    for (let y = 0; y < axisConfig.y; y++) {
      for (let x = 0; x < axisConfig.x; x++) {
        const id = `${x}-${y}-${zLevel}`;
        ids.push(id);
      }
    }
    addToQueue(ids);
  };

  const handleGenerateCell = (id: string) => {
    addToQueue([id]);
    setSelectedCellId(id);
  };

  const handleGenerateAll = () => {
      const total = axisConfig.x * axisConfig.y * axisConfig.z;
      if(!window.confirm(`This will generate ${total} images. It will take several minutes due to rate limits. Continue?`)) return;
      const ids = Object.keys(gridData);
      addToQueue(ids);
  }

  const handleReset = () => {
     if(!window.confirm("Clear all images?")) return;
     setQueue([]);
     setProcessing(false); // Force stop processing next batch
     setGridData(prev => {
         const next = {...prev};
         Object.keys(next).forEach(k => {
             next[k].status = 'idle';
             next[k].imageUrl = undefined;
         });
         return next;
     });
  }

  // Calculate current slice data
  const currentSlice = useMemo(() => {
    const slice: CellData[] = [];
    for (let y = axisConfig.y - 1; y >= 0; y--) { 
      // y iterates from (size-1) down to 0 (Visual Top to Bottom)
      // We want Top Row to be High Energy (Max Index)
      // And Bottom Row to be Low Energy (Index 0)
      
      for (let x = 0; x < axisConfig.x; x++) {
        const id = `${x}-${y}-${zLevel}`;
        if (gridData[id]) {
          slice.push(gridData[id]);
        }
      }
    }
    return slice;
  }, [gridData, zLevel, axisConfig]);

  const selectedCell = selectedCellId ? gridData[selectedCellId] : null;

  return (
    <div className="flex h-screen bg-gray-900 text-gray-100 font-sans">
      
      {/* Sidebar Controls */}
      <div className="w-80 flex flex-col border-r border-gray-800 bg-gray-900/50 backdrop-blur-sm z-20 shadow-xl">
        <div className="p-6 border-b border-gray-800">
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-2">
            <Layers className="w-6 h-6 text-blue-400" />
            GenMatrix 3D
          </h1>
          <p className="text-xs text-gray-500 mt-1">Experimental Gemini Batcher</p>
        </div>

        <div className="p-6 flex-1 overflow-y-auto space-y-6">
          
          {/* Settings Toggle */}
          <div className="bg-gray-800/50 rounded-lg p-3 border border-gray-800">
            <button 
                onClick={() => setShowSettings(!showSettings)}
                className="w-full flex items-center justify-between text-xs font-bold text-gray-400 hover:text-white uppercase tracking-wider mb-2"
            >
                <div className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" /> Grid Configuration
                </div>
                <Settings className={`w-3 h-3 transition-transform ${showSettings ? 'rotate-90' : ''}`} />
            </button>
            
            {showSettings && (
                <div className="space-y-4 pt-2 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500">X-Axis Steps (Stylization)</label>
                        <div className="flex gap-1">
                            {[2, 3, 4, 5].map(n => (
                                <button
                                    key={`x-${n}`}
                                    onClick={() => setAxisConfig(prev => ({ ...prev, x: n }))}
                                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                        axisConfig.x === n 
                                        ? 'bg-blue-600 border-blue-500 text-white' 
                                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500">Y-Axis Steps (Energy)</label>
                        <div className="flex gap-1">
                            {[2, 3, 4, 5].map(n => (
                                <button
                                    key={`y-${n}`}
                                    onClick={() => setAxisConfig(prev => ({ ...prev, y: n }))}
                                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                        axisConfig.y === n 
                                        ? 'bg-green-600 border-green-500 text-white' 
                                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs text-gray-500">Z-Axis Steps (Physical)</label>
                        <div className="flex gap-1">
                            {[2, 3, 4, 5].map(n => (
                                <button
                                    key={`z-${n}`}
                                    onClick={() => setAxisConfig(prev => ({ ...prev, z: n }))}
                                    className={`flex-1 py-1.5 text-xs rounded border transition-colors ${
                                        axisConfig.z === n 
                                        ? 'bg-purple-600 border-purple-500 text-white' 
                                        : 'bg-gray-700 border-gray-600 text-gray-400 hover:bg-gray-600'
                                    }`}
                                >
                                    {n}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}
             {!showSettings && (
                 <div className="flex gap-2 text-[10px] text-gray-500 font-mono">
                     <span className="bg-gray-900 px-1 rounded">X: {axisConfig.x}</span>
                     <span className="bg-gray-900 px-1 rounded">Y: {axisConfig.y}</span>
                     <span className="bg-gray-900 px-1 rounded">Z: {axisConfig.z}</span>
                 </div>
             )}
          </div>

          {/* Base Prompt */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-400 uppercase tracking-wider">Base Subject</label>
            <textarea
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24"
              placeholder="e.g. A cyberpunk detective..."
            />
            <p className="text-[10px] text-gray-500">
              💡 Leave empty or use default to let AI generate a character based on the axis dimensions
            </p>
          </div>

          {/* Z-Axis Selector */}
          <div className="space-y-4">
             <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-400 uppercase tracking-wider flex items-center gap-2">
                    <Box className="w-4 h-4" /> Z-Axis (Depth)
                </label>
                <span className="text-xs text-blue-400 font-mono">Level {zLevel + 1}/{axisConfig.z}</span>
             </div>
             
             <div className="flex flex-col gap-2">
                 {Array.from({ length: axisConfig.z }).map((_, idx) => {
                     // Calculate which data level this step maps to
                     const dataLevel = mapIndexToDataLevel(idx, axisConfig.z);
                     return (
                         <button
                            key={idx}
                            onClick={() => setZLevel(idx)}
                            className={`text-left p-3 rounded-md text-xs transition-all border ${
                                zLevel === idx 
                                ? 'bg-blue-900/30 border-blue-500 text-blue-100' 
                                : 'bg-gray-800 border-transparent text-gray-400 hover:bg-gray-750 hover:border-gray-600'
                            }`}
                         >
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold">Step {idx + 1}</span>
                                <span className="text-[10px] opacity-50 bg-gray-900 px-1.5 py-0.5 rounded">Source Lvl {dataLevel}</span>
                            </div>
                            <div className="opacity-70 truncate text-[10px]">{Z_AXIS.levels[dataLevel]}</div>
                         </button>
                     );
                 })}
             </div>
          </div>

          {/* View Mode Toggle */}
          <div className="flex gap-2 pt-4 border-t border-gray-800">
            <button
              onClick={() => setViewMode('2d')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                viewMode === '2d'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <LayoutGrid className="w-4 h-4" /> 2D Slice
            </button>
            <button
              onClick={() => setViewMode('3d')}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 ${
                viewMode === '3d'
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700 border border-gray-700'
              }`}
            >
              <Boxes className="w-4 h-4" /> 3D View
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-4 border-t border-gray-800">
            {(processing || queue.length > 0) ? (
                 <button
                    onClick={handleStop}
                    className="w-full py-3 px-4 bg-red-600 hover:bg-red-500 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-red-900/20 animate-in fade-in zoom-in-95 duration-200"
                >
                    <Square className="w-4 h-4 fill-current" />
                    Stop Generation ({queue.length})
                </button>
            ) : (
                <button
                    onClick={handleGenerateSlice}
                    disabled={processing || queue.length > 0}
                    className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors flex items-center justify-center gap-2 shadow-lg shadow-blue-900/20"
                >
                    <Play className="w-4 h-4 fill-current" />
                    Generate Slice ({axisConfig.x * axisConfig.y})
                </button>
            )}
            
            <div className="grid grid-cols-2 gap-2">
                 <button
                    onClick={handleGenerateAll}
                    disabled={processing || queue.length > 0}
                    className="py-2 px-3 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                    <Layers className="w-3 h-3" /> Gen All ({axisConfig.x * axisConfig.y * axisConfig.z})
                </button>
                <button
                    onClick={handleReset}
                    className="py-2 px-3 bg-gray-800 hover:bg-red-900/30 border border-gray-700 hover:border-red-800/50 rounded-lg text-xs font-medium transition-colors flex items-center justify-center gap-2 text-red-400"
                >
                    <RotateCcw className="w-3 h-3" /> Reset
                </button>
            </div>
             <div className="text-xs text-center text-gray-600 mt-2 font-mono">
                {processing ? 'Processing...' : 'Ready'} | Queue: {queue.length}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        
        {/* Detail Panel (Top) if selected */}
        {selectedCell && (
            <div className="h-48 border-b border-gray-800 bg-gray-900 flex items-start p-6 gap-6 animate-in slide-in-from-top-4">
                <div className="aspect-square h-full rounded-lg overflow-hidden bg-gray-800 border border-gray-700 shrink-0">
                    {selectedCell.imageUrl ? (
                        <img src={selectedCell.imageUrl} className="w-full h-full object-cover" alt="Detail" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600 text-xs">
                           {selectedCell.status === 'queued' ? 'Queued' : 'No Image'}
                        </div>
                    )}
                </div>
                <div className="flex-1 overflow-y-auto h-full pr-2 space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                        <span className="px-2 py-0.5 rounded bg-blue-900/50 text-blue-300 text-xs border border-blue-800 font-mono">
                            X: {selectedCell.coord.x} (Style {mapIndexToDataLevel(selectedCell.coord.x, axisConfig.x)})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-green-900/50 text-green-300 text-xs border border-green-800 font-mono">
                            Y: {selectedCell.coord.y} (Energy {mapIndexToDataLevel(selectedCell.coord.y, axisConfig.y)})
                        </span>
                        <span className="px-2 py-0.5 rounded bg-purple-900/50 text-purple-300 text-xs border border-purple-800 font-mono">
                            Z: {selectedCell.coord.z} (Phys {mapIndexToDataLevel(selectedCell.coord.z, axisConfig.z)})
                        </span>
                    </div>
                    {selectedCell.characterDescription && (
                        <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-700/50 rounded-lg p-2">
                            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold">AI Generated Character</span>
                            <p className="text-sm text-amber-100 mt-1">{selectedCell.characterDescription}</p>
                        </div>
                    )}
                    <p className="text-sm text-gray-300 leading-relaxed font-mono bg-gray-950 p-3 rounded border border-gray-800">
                        {selectedCell.prompt || getPromptForCell(selectedCell.coord, subject)}
                    </p>
                    <div className="flex gap-2 mt-2">
                         <button 
                            onClick={() => handleGenerateCell(selectedCell.id)}
                            className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded border border-gray-700 transition-colors flex items-center gap-2"
                        >
                            <RefreshCw className="w-3 h-3" /> Regenerate
                        </button>
                         {selectedCell.imageUrl && (
                            <a 
                                href={selectedCell.imageUrl} 
                                download={`gen-x${selectedCell.coord.x}-y${selectedCell.coord.y}-z${selectedCell.coord.z}.png`}
                                className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded border border-gray-700 transition-colors flex items-center gap-2"
                            >
                                <Download className="w-3 h-3" /> Download
                            </a>
                        )}
                         <button 
                            onClick={() => setSelectedCellId(null)}
                            className="text-xs text-gray-500 hover:text-gray-300 px-3 py-1.5 ml-auto"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Matrix Visualization */}
        {viewMode === '2d' ? (
          <div className="flex-1 p-8 overflow-auto flex flex-col items-center justify-center relative bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800/20 via-gray-900 to-gray-900">
            
            {/* Y-Axis Label */}
            <div className="absolute left-8 top-1/2 -translate-y-1/2 -rotate-90 flex items-center gap-4 text-gray-400 font-medium tracking-widest origin-center whitespace-nowrap">
               <span className="text-xs uppercase opacity-50">Low Energy</span>
               <div className="h-px w-24 bg-gradient-to-l from-green-500/50 to-transparent"></div>
               <Zap className="w-5 h-5 text-green-500" />
               <span>{Y_AXIS.name}</span>
               <Zap className="w-5 h-5 text-green-500" />
               <div className="h-px w-24 bg-gradient-to-r from-green-500/50 to-transparent"></div>
               <span className="text-xs uppercase opacity-50">High Energy</span>
            </div>

            <div className="relative">
               {/* Grid */}
               <div 
                  className="grid gap-3" 
                  style={{ 
                      gridTemplateColumns: `repeat(${axisConfig.x}, minmax(80px, 140px))` 
                  }}
               >
                  {currentSlice.map((cell) => (
                      <GridCell 
                          key={cell.id} 
                          data={cell} 
                          selected={selectedCellId === cell.id}
                          onClick={() => setSelectedCellId(cell.id)} 
                      />
                  ))}
               </div>

               {/* X-Axis Label */}
               <div className="absolute -bottom-12 left-0 right-0 flex items-center justify-center gap-4 text-gray-400 font-medium tracking-widest mt-4">
                   <span className="text-xs uppercase opacity-50">Realistic</span>
                   <div className="h-px w-24 bg-gradient-to-l from-blue-500/50 to-transparent"></div>
                   <Palette className="w-5 h-5 text-blue-500" />
                   <span>{X_AXIS.name}</span>
                   <Palette className="w-5 h-5 text-blue-500" />
                   <div className="h-px w-24 bg-gradient-to-r from-blue-500/50 to-transparent"></div>
                   <span className="text-xs uppercase opacity-50">Stylized</span>
               </div>
            </div>
          </div>
        ) : (
          <div className="flex-1 relative">
            <Grid3DView
              gridData={gridData}
              axisConfig={axisConfig}
              onCellClick={setSelectedCellId}
              selectedCellId={selectedCellId}
              xAxisName={X_AXIS.name}
              yAxisName={Y_AXIS.name}
              zAxisName={Z_AXIS.name}
            />
          </div>
        )}
      </div>
    </div>
  );
};

const LoaderIcon = () => (
    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
);

export default App;