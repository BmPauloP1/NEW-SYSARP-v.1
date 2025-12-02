import React, { useState, useEffect } from "react";
import { base44 } from "../services/base44Client";
import { Card } from "../components/ui_components";
import { Badge } from "../components/ui_components";
import { Video, Play, Radio as RadioIcon, Users, Calendar, MapPin } from "lucide-react";
import { Operation, Pilot, Drone, MISSION_LABELS } from "../types";

const extractVideoId = (url: string) => {
  if (!url) return null;
  
  // YouTube Live specific (formato comum para lives: youtube.com/live/ID)
  const liveMatch = url.match(/youtube\.com\/live\/([^?&/]{11})/);
  if (liveMatch) return { type: 'youtube', id: liveMatch[1] };

  // YouTube Standard
  const youtubeMatch = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/);
  if (youtubeMatch) return { type: 'youtube', id: youtubeMatch[1] };
  
  // Vimeo
  const vimeoMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vimeoMatch) return { type: 'vimeo', id: vimeoMatch[1] };
  
  // Twitch
  const twitchMatch = url.match(/twitch\.tv\/([^\/\?]+)/);
  if (twitchMatch) return { type: 'twitch', channel: twitchMatch[1] };
  
  return { type: 'iframe', url };
};

const VideoPlayer = ({ videoData, isMain }: { videoData: any, isMain: boolean }) => {
  if (!videoData) return null;
  
  // Use Tailwind aspect-video for responsive height instead of fixed pixels
  const containerClass = isMain 
    ? "w-full aspect-video bg-black rounded-lg shadow-md" 
    : "w-full aspect-video bg-black rounded-lg";
  
  // Safe origin check
  const origin = window.location.origin && window.location.origin !== 'null' 
    ? `&origin=${encodeURIComponent(window.location.origin)}` 
    : '';

  if (videoData.type === 'youtube') {
    return (
      <iframe
        src={`https://www.youtube.com/embed/${videoData.id}?rel=0&modestbranding=1${origin}`}
        title="YouTube video player"
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        className={containerClass}
      />
    );
  }
  
  if (videoData.type === 'vimeo') {
    return (
      <iframe
        src={`https://player.vimeo.com/video/${videoData.id}`}
        frameBorder="0"
        allow="fullscreen; picture-in-picture"
        allowFullScreen
        className={containerClass}
      />
    );
  }
  
  if (videoData.type === 'twitch') {
    return (
      <iframe
        src={`https://player.twitch.tv/?channel=${videoData.channel}&parent=${window.location.hostname}`}
        frameBorder="0"
        allowFullScreen
        className={containerClass}
      />
    );
  }
  
  return (
    <iframe
      src={videoData.url}
      frameBorder="0"
      allowFullScreen
      className={containerClass}
    />
  );
};

export default function Transmissions() {
  const [operations, setOperations] = useState<Operation[]>([]);
  const [pilots, setPilots] = useState<Pilot[]>([]);
  const [drones, setDrones] = useState<Drone[]>([]);
  const [mainStream, setMainStream] = useState<Operation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [ops, pil, drn] = await Promise.all([
        base44.entities.Operation.filter({ status: "active" }),
        base44.entities.Pilot.list(),
        base44.entities.Drone.list()
      ]);
      
      // Filter only ops with valid streams
      const activeWithStreams = ops.filter(op => op.stream_url && op.stream_url.length > 5);
      
      setOperations(activeWithStreams);
      setPilots(pil);
      setDrones(drn);
      
      // If we have streams but no main selected (or main became inactive), select first
      if (activeWithStreams.length > 0) {
         if (!mainStream || !activeWithStreams.find(op => op.id === mainStream.id)) {
            setMainStream(activeWithStreams[0]);
         }
      } else {
         setMainStream(null);
      }

    } catch (e) {
      console.error("Failed to load transmission data", e);
    } finally {
      setLoading(false);
    }
  };

  const otherStreams = operations.filter(op => op.id !== mainStream?.id);

  if (loading) {
    return (
      <div className="flex flex-col h-full items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600" />
        <p className="mt-4 text-slate-500 font-medium">Carregando transmissões...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header Fixed */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 p-4 shadow-sm z-10 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-red-600 animate-pulse" />
            Central de Transmissões
          </h1>
          <p className="text-xs text-slate-500 hidden sm:block">Monitoramento em Tempo Real de Aeronaves</p>
        </div>
        <div className="flex items-center gap-2">
           <Badge variant={operations.length > 0 ? 'danger' : 'default'} className="animate-fade-in">
              {operations.length > 0 ? `${operations.length} AO VIVO` : 'OFFLINE'}
           </Badge>
        </div>
      </div>

      {/* Main Content Area */}
      {operations.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-slate-400">
          <div className="bg-slate-100 p-6 rounded-full mb-4">
             <RadioIcon className="w-16 h-16 opacity-30" />
          </div>
          <h3 className="text-lg font-semibold text-slate-600 mb-2">Nenhuma transmissão ativa no momento</h3>
          <p className="text-center max-w-md text-sm">
            As operações com links de transmissão (RTMP, YouTube, DroneDeploy) configurados aparecerão automaticamente aqui.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          
          {/* Main Player Column (Scrollable) */}
          <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-black/5 lg:bg-slate-50">
             {mainStream && (
                <div className="max-w-5xl mx-auto space-y-4 animate-fade-in">
                   {/* Player Container */}
                   <div className="bg-black rounded-xl overflow-hidden shadow-lg border border-slate-800">
                      <VideoPlayer videoData={extractVideoId(mainStream.stream_url || '')} isMain={true} />
                   </div>

                   {/* Video Details Card */}
                   <Card className="p-0 overflow-hidden border-0 shadow-md">
                      <div className="bg-white p-4 md:p-6">
                         <div className="flex flex-col md:flex-row md:justify-between md:items-start gap-4">
                            <div className="flex-1">
                               <div className="flex items-center gap-2 mb-2">
                                  <Badge variant="danger" className="animate-pulse">AO VIVO</Badge>
                                  <span className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded">#{mainStream.occurrence_number}</span>
                               </div>
                               <h2 className="text-xl md:text-2xl font-bold text-slate-900 leading-tight mb-2">{mainStream.name}</h2>
                               <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-100">
                                  {mainStream.description || 'Sem descrição operacional.'}
                               </p>
                            </div>
                         </div>

                         <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Users className="w-5 h-5"/></div>
                               <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase">Piloto</p>
                                  <p className="text-sm font-semibold text-slate-900">{pilots.find(p => p.id === mainStream.pilot_id)?.full_name || 'N/A'}</p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><MapPin className="w-5 h-5"/></div>
                               <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase">Aeronave</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                     {drones.find(d => d.id === mainStream.drone_id)?.model || 'N/A'}
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Calendar className="w-5 h-5"/></div>
                               <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase">Início</p>
                                  <p className="text-sm font-semibold text-slate-900">
                                     {new Date(mainStream.start_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                  </p>
                               </div>
                            </div>
                            <div className="flex items-start gap-3">
                               <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><RadioIcon className="w-5 h-5"/></div>
                               <div>
                                  <p className="text-xs text-slate-500 font-bold uppercase">Missão</p>
                                  <p className="text-sm font-semibold text-slate-900">{MISSION_LABELS[mainStream.mission_type]}</p>
                               </div>
                            </div>
                         </div>
                      </div>
                   </Card>
                </div>
             )}
          </div>

          {/* Sidebar Playlist (Right side on Desktop, Bottom on Mobile) */}
          <div className="w-full lg:w-96 flex-shrink-0 bg-white border-l border-slate-200 overflow-y-auto h-auto lg:h-full shadow-xl z-10">
             <div className="p-4 bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                   <Play className="w-4 h-4 fill-slate-700" /> Outras Câmeras ({otherStreams.length})
                </h3>
             </div>
             
             <div className="p-3 space-y-3 pb-8">
                {otherStreams.length === 0 && (
                   <p className="text-sm text-slate-400 italic text-center py-8">Nenhuma outra transmissão.</p>
                )}
                
                {otherStreams.map((op) => {
                   const pilot = pilots.find(p => p.id === op.pilot_id);
                   
                   return (
                      <div 
                        key={op.id}
                        onClick={() => setMainStream(op)}
                        className="group cursor-pointer bg-white border border-slate-200 rounded-lg overflow-hidden hover:border-red-500 hover:shadow-md transition-all"
                      >
                         {/* Mini Thumbnail */}
                         <div className="relative aspect-video bg-black w-full">
                            <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-transparent transition-all">
                               <VideoPlayer videoData={extractVideoId(op.stream_url || '')} isMain={false} />
                            </div>
                            {/* Overlay to prevent interaction with mini player, allowing click to select */}
                            <div className="absolute inset-0 bg-transparent z-10"></div>
                            
                            <div className="absolute top-2 right-2 bg-red-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-sm z-20">
                               LIVE
                            </div>
                         </div>
                         
                         <div className="p-3">
                            <h4 className="font-bold text-sm text-slate-800 line-clamp-1 group-hover:text-red-600 transition-colors">{op.name}</h4>
                            <div className="flex justify-between items-center mt-1">
                               <span className="text-xs text-slate-500 truncate max-w-[60%]">{pilot?.full_name || 'N/A'}</span>
                               <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 rounded text-slate-600 font-medium">
                                  {MISSION_LABELS[op.mission_type].split(' ')[0]}...
                               </span>
                            </div>
                         </div>
                      </div>
                   )
                })}
             </div>
          </div>

        </div>
      )}
    </div>
  );
}