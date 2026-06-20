import React from 'react';
import { Video } from '../types';
import { Play, Clock } from 'lucide-react';
import { motion } from 'motion/react';
import SafeImage from './SafeImage';

interface VideoCardProps {
  video: Video;
  onClick: (video: Video) => void;
}

const VideoCard: React.FC<VideoCardProps> = ({ video, onClick }) => {
  return (
    <motion.div
      whileHover={{ rotateX: -1, scale: 1.01 }}
      style={{ perspective: '1000px' }}
      onClick={() => onClick(video)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick(video);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`پخش ویدئو ${video.title}`}
      className="group bg-skin-card border border-skin-border rounded-2xl overflow-hidden cursor-pointer
        shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
        hover:border-skin-primary/30 focus-visible:outline-none focus-visible:ring-2
        focus-visible:ring-skin-primary focus-visible:ring-offset-2 focus-visible:ring-offset-skin-base
        flex flex-col h-full transition-all duration-300"
    >
      {/* Thumbnail */}
      <div className="relative aspect-video overflow-hidden bg-skin-control-bg">
        <SafeImage
          src={video.coverImage}
          alt={video.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          decoding="async"
        />

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/20 transition-colors" />

        {/* Pulsing play button — redesign 2.5 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex items-center justify-center">
            {/* Pulsing outer ring */}
            <div className="absolute w-16 h-16 rounded-full border-2 border-white/60 opacity-0 group-hover:opacity-100 pulse-ring" />
            {/* Static outer ring */}
            <div className="absolute w-12 h-12 rounded-full border-2 border-white/40" />
            {/* Play icon */}
            <div className="relative z-10 w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:bg-skin-primary group-hover:scale-110 transition-all duration-300">
              <Play size={16} className="text-skin-primary group-hover:text-white mr-0.5 fill-current transition-colors" />
            </div>
          </div>
        </div>

        {/* Duration badge — bottom-left (RTL-aware), redesign 2.5 */}
        {video.duration && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 bg-black/70 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1 rounded-full border border-white/10">
            <Clock size={10} />
            <span>{video.duration}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col gap-1">
        <h3 className="font-bold text-skin-text text-sm leading-snug line-clamp-2 group-hover:text-skin-primary transition-colors">
          {video.title}
        </h3>
        {video.description && (
          <p className="text-xs text-skin-muted line-clamp-2 leading-relaxed">{video.description}</p>
        )}
        <p className="text-[11px] text-skin-muted mt-auto pt-1">{video.date}</p>
      </div>
    </motion.div>
  );
};

export default VideoCard;
