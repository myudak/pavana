/** Ignore incomplete pointer events instead of turning the selection into NaN. */
export function chartIndexAt(position: number | undefined, width: number, count: number) {
  if (
    position === undefined ||
    !Number.isFinite(position) ||
    !Number.isFinite(width) ||
    width <= 0 ||
    count <= 0
  )
    return null;
  return Math.min(count - 1, Math.max(0, Math.round((position / width) * (count - 1))));
}

/** Break at every missing point; never draw a forecast across missing coverage. */
export function lineSegments(values: readonly (number | null)[], width: number, height: number) {
  const finite = values.filter((x): x is number => x !== null && Number.isFinite(x));
  const max = Math.max(1, ...finite) * 1.15;
  const segments: { x: number; y: number }[][] = [];
  let segment: { x: number; y: number }[] = [];
  values.forEach((value, i) => {
    if (value === null || !Number.isFinite(value)) {
      if (segment.length) segments.push(segment);
      segment = [];
    } else {
      segment.push({
        x: values.length <= 1 ? width / 2 : (i / (values.length - 1)) * width,
        y: height - (value / max) * height,
      });
    }
  });
  if (segment.length) segments.push(segment);
  return { segments, max, hasData: finite.length > 0 };
}
