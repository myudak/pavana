type RectLike = Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>;
type GeometryMetrics = Pick<
  HTMLElement,
  'scrollLeft' | 'scrollTop' | 'offsetWidth' | 'offsetHeight'
> & {
  borderLeft: number;
  borderTop: number;
};

export function getIndicatorLocalBounds(
  rootRect: RectLike,
  activeRect: RectLike,
  root: GeometryMetrics,
) {
  // DOMRects are rendered pixels; inline geometry is local CSS pixels.
  const scaleX = root.offsetWidth > 0 ? rootRect.width / root.offsetWidth : 1;
  const scaleY = root.offsetHeight > 0 ? rootRect.height / root.offsetHeight : 1;

  return {
    left: (activeRect.left - rootRect.left) / scaleX - root.borderLeft + root.scrollLeft,
    top: (activeRect.top - rootRect.top) / scaleY - root.borderTop + root.scrollTop,
    width: activeRect.width / scaleX,
    height: activeRect.height / scaleY,
  };
}
