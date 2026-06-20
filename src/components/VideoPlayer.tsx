import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Video } from '../types';
import { X, Calendar, Tv2 } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface VideoPlayerProps {
  video: Video;
  onClose: () => void;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video, onClose }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const lastFocusRef = useRef<HTMLElement | null>(null);
  const [pipAvailable, setPipAvailable] = useState(false);
  const [pipActive, setPipActive] = useState(false);
  // Fix 7: Add error state for video loading failures
  const [videoError, setVideoError] = useState<string | null>(null);
  // UX-NEW-06: Playback speed control
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // Fix 4.7: centralized scroll lock
  useBodyScrollLock(true);

  // UX-NEW-06: Update video playback speed
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed]);

  useEffect(() => {
    setPipAvailable(document.pictureInPictureEnabled ?? false);
  }, []);

  // Focus trap (Fix 1.10)
  const getFocusable = useCallback((root: HTMLElement): HTMLElement[] => {
    return Array.from(
      root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      )
    ).filter(el => !el.hasAttribute('disabled') && el.getAttribute('aria-hidden') !== 'true');
  }, []);

  useEffect(() => {
    lastFocusRef.current = document.activeElement as HTMLElement;
    const root = dialogRef.current;
    if (!root) return;
    const focusable = getFocusable(root);
    (focusable[0] ?? root).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (e.key !== 'Tab') return;
      const items = getFocusable(root);
      if (items.length === 0) return;
      const first = items[0]!;
      const last = items[items.length - 1]!;
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      lastFocusRef.current?.focus?.();
    };
  }, [getFocusable, onClose]);

  // PiP handlers
  const togglePip = async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        setPipActive(false);
      } else if (videoRef.current) {
        await videoRef.current.requestPictureInPicture();
        setPipActive(true);
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  };

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid) return;
    const onEnterPip = () => setPipActive(true);
    const onLeavePip = () => setPipActive(false);
    vid.addEventListener('enterpictureinpicture', onEnterPip);
    vid.addEventListener('leavepictureinpicture', onLeavePip);
    return () => {
      vid.removeEventListener('enterpictureinpicture', onEnterPip);
      vid.removeEventListener('leavepictureinpicture', onLeavePip);
    };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md animate-fade-in p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`پخش ویدئو: ${video.title}`}
    >
      <div
        ref={dialogRef}
        className="bg-skin-card rounded-2xl shadow-2xl border border-skin-border w-full max-w-4xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 p-4 border-b border-skin-border flex-wrap">
          <h2 className="font-bold text-skin-text text-base leading-snug">{video.title}</h2>
          <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
            {/* UX-NEW-06: Playback speed selector */}
            <div className="flex items-center gap-1 bg-skin-control-bg rounded-lg p-1">
              {[0.75, 1, 1.25, 1.5, 2].map(speed => (
                <button
                  key={speed}
                  onClick={() => setPlaybackSpeed(speed)}
                  className={`text-[10px] px-2 py-1 rounded transition-all font-mono font-bold ${
                    playbackSpeed === speed
                      ? 'bg-skin-primary text-white'
                      : 'text-skin-muted hover:text-skin-text hover:bg-skin-control-hover'
                  }`}
                  title={`سرعت ${speed}×`}
                  aria-label={`سرعت ${speed}×`}
                >
                  {speed}×
                </button>
              ))}
            </div>
            {/* Fix 3.6: PiP button */}
            {pipAvailable && (
              <button
                onClick={togglePip}
                aria-label={pipActive ? 'خروج از تصویر در تصویر' : 'تصویر در تصویر'}
                title={pipActive ? 'خروج از تصویر در تصویر' : 'تصویر در تصویر'}
                className={`p-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary ${
                  pipActive ? 'bg-skin-primary text-white' : 'bg-skin-control-bg text-skin-muted hover:text-skin-primary hover:bg-skin-control-hover'
                }`}
              >
                <Tv2 size={16} />
              </button>
            )}
            <button
              onClick={onClose}
              aria-label="بستن"
              className="p-2 rounded-lg bg-skin-control-bg hover:bg-skin-control-hover text-skin-muted hover:text-skin-text transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-skin-primary"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Video */}
        <div className="relative bg-black">
          {videoError ? (
            <div className="flex items-center justify-center w-full h-[400px] bg-black/50 text-white">
              <div className="text-center">
                <p className="font-bold mb-2">خطا در بارگذاری ویدئو</p>
                <p className="text-sm text-gray-300">{videoError}</p>
              </div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={video.videoUrl}
              controls
              autoPlay
              className="w-full max-h-[70vh] outline-none"
              playsInline
              onError={(e) => {
                const error = e.currentTarget.error;
                const message = error?.message || 'خطای نامشخص در پخش ویدئو';
                setVideoError(message);
              }}
            >
              مرورگر شما از پخش ویدئو پشتیبانی نمی‌کند.
            </video>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 flex items-center gap-3 text-sm text-skin-muted">
          <Calendar size={14} className="shrink-0 text-skin-primary" />
          <span>تاریخ انتشار: {video.date}</span>
          {video.description && (
            <>
              <span className="text-skin-border">·</span>
              <span className="line-clamp-1">{video.description}</span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
