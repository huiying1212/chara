import React from 'react';
import { CellData } from '../types';
import { Loader2, RefreshCw, AlertCircle, Clock } from 'lucide-react';

interface GridCellProps {
  data: CellData;
  onClick: () => void;
  selected: boolean;
}

export const GridCell: React.FC<GridCellProps> = ({ data, onClick, selected }) => {
  return (
    <div 
      onClick={onClick}
      className={`
        relative aspect-square rounded-lg overflow-hidden cursor-pointer transition-all duration-200 border-2
        ${selected ? 'border-blue-500 ring-2 ring-blue-500/50 scale-105 z-10 shadow-lg' : 'border-gray-700 hover:border-gray-500 hover:scale-[1.02]'}
        bg-gray-800
      `}
    >
      {data.status === 'success' && data.imageUrl ? (
        <img 
          src={data.imageUrl} 
          alt={data.prompt} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center text-gray-400">
          {data.status === 'loading' && (
            <Loader2 className="w-8 h-8 animate-spin text-blue-400" />
          )}
          {data.status === 'queued' && (
            <div className="flex flex-col items-center gap-1 text-yellow-500/70">
              <Clock className="w-6 h-6 animate-pulse" />
              <span className="text-[10px] uppercase font-bold tracking-wider">Queued</span>
            </div>
          )}
          {data.status === 'error' && (
            <div className="text-red-400 flex flex-col items-center gap-1">
              <AlertCircle className="w-6 h-6" />
              <span className="text-xs">Failed</span>
            </div>
          )}
          {data.status === 'idle' && (
            <div className="flex flex-col items-center gap-1 opacity-50">
               <span className="text-xs font-mono">
                X:{data.coord.x} Y:{data.coord.y}
               </span>
            </div>
          )}
        </div>
      )}

      {/* Overlay Status Indicator */}
      <div className="absolute top-1 right-1">
         {data.status === 'loading' && <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />}
         {data.status === 'queued' && <div className="w-2 h-2 bg-yellow-500 rounded-full" />}
         {data.status === 'error' && <div className="w-2 h-2 bg-red-500 rounded-full" />}
      </div>
    </div>
  );
};