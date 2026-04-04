import React, { useState, useRef, useEffect } from 'react';
import { Loader2, CheckCircle2, ShieldOff, Activity, Camera, RefreshCw, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { cn } from '../../lib/utils';
import { AuraButton } from './AuraButton';

interface MobileMicViewProps {
    token: string;
}

export const MobileMicView: React.FC<MobileMicViewProps> = ({ token }) => {
    const [status, setStatus] = useState<'validating' | 'ready' | 'recording' | 'transcribing' | 'expired'>('validating');
    const [lastText, setLastText] = useState<string>('');
    const [studyUid, setStudyUid] = useState<string | null>(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const wakeLockRef = useRef<any>(null);

    // 🔒 Wake Lock API - Mantener pantalla encendida
    useEffect(() => {
        const requestWakeLock = async () => {
            try {
                if ('wakeLock' in navigator) {
                    wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
                }
            } catch (err) {
                console.warn('Wake Lock no disponible:', err);
            }
        };

        if (status !== 'validating' && status !== 'expired') {
            requestWakeLock();
        }

        return () => {
            if (wakeLockRef.current) wakeLockRef.current.release().then(() => wakeLockRef.current = null);
        };
    }, [status]);

    // 📡 Connection Status - Notificar al PC
    useEffect(() => {
        if (status === 'ready' || status === 'recording' || status === 'transcribing') {
            supabase.from('remote_dictation_sessions').update({ is_connected: true }).eq('session_token', token).then();
        }
        
        const handleUnload = () => {
            supabase.from('remote_dictation_sessions').update({ is_connected: false }).eq('session_token', token).then();
        };

        window.addEventListener('beforeunload', handleUnload);
        return () => {
            handleUnload();
            window.removeEventListener('beforeunload', handleUnload);
        };
    }, [status, token]);

    useEffect(() => {
        const validateSession = async () => {
            try {
                const { data, error } = await supabase
                    .from('remote_dictation_sessions')
                    .select('study_uid, expires_at')
                    .eq('session_token', token)
                    .single();

                if (error || !data || new Date(data.expires_at) < new Date()) {
                    setStatus('expired');
                    return;
                }

                setStudyUid(data.study_uid);
                setStatus('ready');
            } catch (err) {
                console.error('Validation error:', err);
                setStatus('expired');
            }
        };

        validateSession();
    }, [token]);

    const startRecording = async () => {
        try {
            // 📳 Feedback Háptico
            if ('vibrate' in navigator) navigator.vibrate(30);

            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
                handleTranscription(audioBlob);
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorder.start();
            setStatus('recording');
            
            // Sync recording status to DB
            supabase.from('remote_dictation_sessions').update({ is_recording: true }).eq('session_token', token).then();
        } catch (err) {
            console.error('Error accessing microphone:', err);
            alert('No se pudo acceder al micrófono. Por favor permite los permisos.');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            // 📳 Feedback Háptico
            if ('vibrate' in navigator) navigator.vibrate([20, 10, 20]);

            mediaRecorderRef.current.stop();
            setStatus('transcribing');
            
            // Sync recording status to DB
            supabase.from('remote_dictation_sessions').update({ is_recording: false }).eq('session_token', token).then();
        }
    };

    const handleTranscription = async (blob: Blob) => {
        const formData = new FormData();
        formData.append('file', blob, 'recording.wav');

        try {
            const { data: response, error } = await supabase.functions.invoke('voice-transcribe', {
                body: formData,
            });

            if (error || !response?.success) throw new Error(error?.message || 'Error en transcripción');

            const transcribedText = response.text;
            setLastText(transcribedText);

            // 🧠 Voice Commands Processing
            const commands: Record<string, string> = {
                'siguiente sección': 'NEXT_SECTION',
                'firmar informe': 'SIGN_REPORT',
                'limpiar todo': 'CLEAR_ALL',
                'borrar último': 'DELETE_LAST'
            };

            let detectedCommand = null;
            const lowerText = transcribedText.toLowerCase();
            for (const [trigger, cmd] of Object.entries(commands)) {
                if (lowerText.includes(trigger)) {
                    detectedCommand = cmd;
                    break;
                }
            }

            // Update Supabase to notify the Desktop Dashboard via Realtime
            await supabase
                .from('remote_dictation_sessions')
                .update({ 
                    live_text: transcribedText,
                    last_command: detectedCommand,
                    updated_at: new Date().toISOString() as any 
                })
                .eq('session_token', token);

            setStatus('ready');
        } catch (err) {
            console.error('Transcription error:', err);
            alert('Error al transcribir el audio.');
            setStatus('ready');
        }
    };

    if (status === 'validating') {
        return (
            <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8">
                <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase text-brand-text/40 tracking-[0.3em]">Validando Sesión...</p>
            </div>
        );
    }

    if (status === 'expired') {
        return (
            <div className="min-h-screen bg-brand-surface flex flex-col items-center justify-center p-12 text-center">
                <div className="w-24 h-24 rounded-full bg-danger/10 flex items-center justify-center mb-8 border border-danger/20">
                    <ShieldOff className="w-12 h-12 text-danger" />
                </div>
                <h1 className="text-2xl font-black text-brand-text uppercase tracking-tighter mb-4 leading-none">Sesión Expirada</h1>
                <p className="text-xs text-brand-text/40 font-medium leading-relaxed italic mb-8 max-w-xs">
                    El código QR ha caducado por seguridad (30 min) o el examen ha sido cerrado en el PC.
                </p>
                <div className="w-full h-px bg-brand-border" />
            </div>
        );
    }

    const handlePhotoUpload = async () => {
        if (!studyUid) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.capture = 'environment';
        
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            setUploadingImage(true);
            try {
                const filePath = `${studyUid}/${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('study-attachments')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                await supabase.from('study_attachments').insert({
                    study_uid: studyUid,
                    file_path: filePath,
                    file_name: file.name
                });

                if ('vibrate' in navigator) navigator.vibrate([10, 50, 10]);
                alert('Imagen capturada y asociada al estudio.');
            } catch (err) {
                console.error('Error subiendo imagen:', err);
                alert('No se pudo subir la imagen.');
            } finally {
                setUploadingImage(false);
            }
        };
        input.click();
    };

    return (
        <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-between p-8 font-sans overflow-hidden">
            {/* Header */}
            <div className="w-full flex items-center justify-between animate-in fade-in slide-in-from-top-4 duration-700">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-brand-surface border border-brand-border flex items-center justify-center shadow-sm">
                        <Activity className="w-5 h-5 text-brand-primary" />
                    </div>
                    <div>
                        <p className="text-[10px] font-black text-brand-primary uppercase tracking-widest leading-tight">Micrófono Remoto</p>
                        <p className="text-[8px] font-bold text-brand-text/40 uppercase tracking-tighter">Sincronización RIS 2030</p>
                    </div>
                </div>
                <div className={cn(
                    "px-3 py-1.5 rounded-full flex items-center gap-2 border shadow-sm transition-all duration-500",
                    status === 'recording' ? "bg-danger/10 border-danger/20 text-danger" : "bg-success/10 border-success/20 text-success"
                )}>
                    <div className={cn("w-1.5 h-1.5 rounded-full", status === 'recording' ? "bg-danger animate-pulse" : "bg-success")} />
                    <span className="text-[9px] font-black uppercase tracking-widest italic">{status === 'recording' ? 'REC' : 'LIVE'}</span>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center justify-center w-full gap-16">
                {/* Visual Feedback Text */}
                <div className="text-center w-full max-w-sm px-4 min-h-[140px] flex flex-col items-center justify-center">
                    {status === 'transcribing' ? (
                        <div className="animate-in fade-in zoom-in duration-500 flex flex-col items-center">
                            <Loader2 className="w-12 h-12 text-brand-primary animate-spin mb-4" />
                            <p className="text-xs font-black text-brand-primary uppercase tracking-[0.2em] animate-pulse italic">Procesando Dictado...</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-1000 w-full">
                            {lastText && (
                                <div className="p-6 bg-brand-surface/50 border border-brand-border rounded-[2rem] shadow-xl mb-8 animate-in zoom-in-95 backdrop-blur-sm relative overflow-hidden group">
                                    <div className="absolute top-0 left-0 w-1 h-full bg-success opacity-50" />
                                    <p className="text-xs text-brand-text/70 italic font-medium leading-relaxed italic">
                                        "{lastText}"
                                    </p>
                                    <div className="flex justify-center mt-4">
                                         <CheckCircle2 className="w-4 h-4 text-success opacity-40 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            )}
                            <p className="text-sm font-black text-brand-text uppercase italic tracking-tight">
                                {status === 'recording' ? "Efectuando dictado..." : (lastText ? "Sincronizado con Dashboard" : "Listo para grabar")}
                            </p>
                        </div>
                    )}
                </div>

                {/* Aura Button */}
                <AuraButton 
                    isRecording={status === 'recording'} 
                    onClick={status === 'recording' ? stopRecording : startRecording}
                    disabled={status === 'transcribing'}
                />
            </div>

            {/* Footer */}
            <div className="w-full flex flex-col items-center gap-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                 {/* Secondary Tools */}
                 <div className="flex items-center gap-4 w-full px-4">
                    <button 
                        onClick={handlePhotoUpload}
                        disabled={uploadingImage || status === 'recording'}
                        className="flex-1 h-14 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center gap-3 active:scale-95 transition-all text-xs font-black uppercase tracking-widest text-brand-text disabled:opacity-30 shadow-lg shadow-black/20"
                    >
                        {uploadingImage ? (
                            <RefreshCw className="w-5 h-5 text-brand-primary animate-spin" />
                        ) : (
                            <>
                                <Camera className="w-5 h-5 text-brand-primary" />
                                <span>Captura</span>
                            </>
                        )}
                    </button>
                    
                    {/* Placeholder for future features */}
                    <div className="w-14 h-14 bg-brand-surface border border-brand-border rounded-2xl flex items-center justify-center text-brand-text/20">
                        <Send className="w-5 h-5 opacity-20" />
                    </div>
                 </div>

                 <div className="w-full h-px bg-brand-border/50" />
                 <div className="flex flex-col items-center">
                    <p className="text-[9px] font-bold text-brand-text/30 uppercase tracking-[0.3em] mb-1 leading-none">Ecosistema AMIS 3.0</p>
                    <p className="text-[7px] font-black text-brand-primary uppercase tracking-[0.5em] opacity-30">Intelligence Hub</p>
                 </div>
            </div>

            {/* Animated Background Decor */}
             <div className="fixed -bottom-40 -left-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse" />
             <div className="fixed -top-40 -right-40 w-96 h-96 bg-brand-primary/10 rounded-full blur-[120px] pointer-events-none animate-pulse delay-1000" />
        </div>
    );
};
