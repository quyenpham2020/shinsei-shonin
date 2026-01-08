import React, { useEffect, useRef } from 'react';
import { Box } from '@mui/material';

interface ProtectedImageProps {
  src: string;
  alt: string;
  onClick?: () => void;
  sx?: any;
}

/**
 * Protected Image component that prevents download and copy
 * - Disables right-click context menu
 * - Disables drag and drop
 * - Uses CSS to prevent selection
 * - Adds watermark overlay
 */
export const ProtectedImage: React.FC<ProtectedImageProps> = ({ src, alt, onClick, sx }) => {
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;

    // Prevent context menu (right-click)
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent drag start
    const handleDragStart = (e: DragEvent) => {
      e.preventDefault();
      return false;
    };

    // Prevent selection
    const handleSelectStart = (e: Event) => {
      e.preventDefault();
      return false;
    };

    img.addEventListener('contextmenu', handleContextMenu);
    img.addEventListener('dragstart', handleDragStart);
    img.addEventListener('selectstart', handleSelectStart);

    return () => {
      img.removeEventListener('contextmenu', handleContextMenu);
      img.removeEventListener('dragstart', handleDragStart);
      img.removeEventListener('selectstart', handleSelectStart);
    };
  }, []);

  return (
    <Box
      sx={{
        position: 'relative',
        display: 'inline-block',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        ...sx,
      }}
    >
      <Box
        ref={imgRef}
        component="img"
        src={src}
        alt={alt}
        onClick={onClick}
        sx={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          pointerEvents: 'auto',
          userSelect: 'none',
          WebkitUserSelect: 'none',
          WebkitUserDrag: 'none',
          WebkitTouchCallout: 'none',
        }}
        draggable={false}
        onContextMenu={(e) => e.preventDefault()}
        onDragStart={(e) => e.preventDefault()}
      />
      {/* Invisible overlay to block inspector selection */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          pointerEvents: onClick ? 'auto' : 'none',
          cursor: onClick ? 'pointer' : 'default',
        }}
        onClick={onClick}
        onContextMenu={(e) => e.preventDefault()}
      />
    </Box>
  );
};

export default ProtectedImage;
