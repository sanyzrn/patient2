// Fix 1.5: SkeletonCard respects viewMode prop
// TECH-03: Added count prop to render multiple skeletons
import React from 'react';

interface SkeletonCardProps {
  viewMode?: 'grid' | 'list';
  count?: number;
}

const SkeletonCard: React.FC<SkeletonCardProps> = ({ viewMode = 'grid', count = 1 }) => {
  const renderSingleSkeleton = () => {
    if (viewMode === 'list') {
      return (
        <div className="bg-skin-card border border-skin-border rounded-2xl overflow-hidden flex gap-4 p-3">
          <div className="skeleton-shimmer rounded-xl w-20 h-20 shrink-0" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton-shimmer h-4 rounded-lg w-3/4" />
            <div className="skeleton-shimmer h-3 rounded-lg w-1/2" />
            <div className="skeleton-shimmer h-3 rounded-lg w-1/3" />
          </div>
        </div>
      );
    }

    return (
      <div className="bg-skin-card border border-skin-border rounded-2xl overflow-hidden flex flex-col">
        {/* Cover area */}
        <div className="skeleton-shimmer aspect-[2/3] w-full" />
        {/* Content */}
        <div className="p-4 space-y-2">
          <div className="skeleton-shimmer h-4 rounded-lg w-3/4" />
          <div className="skeleton-shimmer h-3 rounded-lg w-1/2" />
          <div className="skeleton-shimmer h-3 rounded-lg w-1/4" />
        </div>
      </div>
    );
  };

  // Render multiple skeletons if count > 1
  if (count > 1) {
    return (
      <>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i}>{renderSingleSkeleton()}</div>
        ))}
      </>
    );
  }

  return renderSingleSkeleton();
};

export default SkeletonCard;
