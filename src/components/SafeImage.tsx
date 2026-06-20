// Shared SafeImage component with error fallback.
import React, { useState, useEffect } from 'react';

const PLACEHOLDER_SVG = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' viewBox='0 0 400 300'%3E%3Crect width='400' height='300' fill='%23f1f5f9'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='14' fill='%2394a3b8'%3Eتصویر در دسترس نیست%3C/text%3E%3C/svg%3E`;

interface SafeImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallbackSrc?: string;
}

const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackSrc,
  onError,
  ...props
}) => {
  const [imgSrc, setImgSrc] = useState(src);

  // Re-attempt loading whenever the source prop changes (e.g. data loads async).
  useEffect(() => { setImgSrc(src); }, [src]);

  const handleError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImgSrc(fallbackSrc || PLACEHOLDER_SVG);
    onError?.(e);
  };

  return (
    <img
      {...props}
      src={imgSrc}
      alt={alt}
      onError={handleError}
      loading={props.loading ?? 'lazy'}
      decoding="async"
    />
  );
};

export default SafeImage;
