import React from 'react';
import { Mic, Square } from 'lucide-react';
import { cn } from '../../lib/utils';

interface AuraButtonProps {
    isRecording: boolean;
    onClick: () => void;
    disabled?: boolean;
}

export const AuraButton: React.FC<AuraButtonProps> = ({ isRecording, onClick, disabled }) => {
    return (
        <div className="relative group">
            {/* Background Aura Glow */}
            <div className={cn(
                "absolute -inset-8 rounded-full blur-3xl opacity-40 transition-all duration-1000",
                isRecording ? "bg-red-500 animate-pulse scale-125" : "bg-brand-primary/20"
            )} />
            
            {/* Inner Glow Surround */}
            <div className={cn(
                "absolute -inset-2 rounded-full opacity-60 blur-xl transition-all duration-500",
                isRecording ? "bg-red-400 animate-pulse" : "bg-brand-primary/10"
            )} />
            
            <button
                onClick={onClick}
                disabled={disabled}
                className={cn(
                    "relative w-48 h-48 rounded-full flex flex-col items-center justify-center transition-all duration-500 border-[6px] shadow-2xl",
                    isRecording 
                        ? "bg-danger/20 border-danger animate-pulse scale-95 shadow-[0_0_80px_rgba(239,68,68,0.5)]" 
                        : "bg-brand-surface border-brand-primary/40 hover:border-brand-primary shadow-[0_0_40px_rgba(249,115,22,0.15)] group-hover:scale-105"
                )}
            >
                <div className={cn(
                    "p-6 rounded-3xl transition-all duration-500",
                    isRecording ? "bg-danger shadow-lg" : "bg-brand-primary/10"
                )}>
                    {isRecording 
                        ? <Square className="w-12 h-12 text-white fill-white animate-in zoom-in-50 duration-300" /> 
                        : <Mic className="w-12 h-12 text-brand-primary" />
                    }
                </div>
                
                <p className={cn(
                    "mt-4 text-[11px] font-black uppercase tracking-[0.3em] transition-colors",
                    isRecording ? "text-danger animate-pulse" : "text-brand-text/40 group-hover:text-brand-primary"
                )}>
                    {isRecording ? "Grabando..." : "Presionar"}
                </p>
                
                {/* Visual Status Rings (only when recording) */}
                {isRecording && (
                    <>
                        <div className="absolute inset-0 rounded-full border-2 border-danger opacity-20 animate-ping" />
                        <div className="absolute inset-0 rounded-full border border-danger opacity-10 animate-ping delay-75" />
                    </>
                )}
            </button>
        </div>
    );
};
