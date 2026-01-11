import React from 'react';
import { motion } from 'framer-motion';

interface CanvasControlsProps {
    scale: number;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onCenter: () => void;
}

export const CanvasControls: React.FC<CanvasControlsProps> = ({ scale, onZoomIn, onZoomOut, onCenter }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="fixed bottom-8 right-8 flex items-center gap-2 bg-gray-900/80 backdrop-blur-md border border-gray-800 p-2 rounded-2xl shadow-2xl z-50"
        >
            <div className="flex items-center gap-1 border-r border-gray-800 pr-2">
                <button
                    onClick={onZoomOut}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Zoom Out"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                </button>
                <span className="text-xs font-mono text-gray-400 min-w-[3rem] text-center">
                    {Math.round(scale * 100)}%
                </span>
                <button
                    onClick={onZoomIn}
                    className="p-2 hover:bg-gray-800 rounded-lg text-gray-400 hover:text-white transition-colors"
                    title="Zoom In"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                </button>
            </div>
            <button
                onClick={onCenter}
                className="flex items-center gap-2 px-3 py-2 hover:bg-gray-800 rounded-xl text-gray-400 hover:text-white transition-colors text-xs font-medium"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
                Center
            </button>
        </motion.div>
    );
};
