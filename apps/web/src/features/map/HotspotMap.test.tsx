import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from '@/lib/theme-context';
import { HotspotMap } from './HotspotMap';

type TestMap = {
  fire: (event: string, ...args: unknown[]) => unknown;
  getSource: (id: string) => { updateImage: (...args: unknown[]) => unknown } | undefined;
};

const { maps } = vi.hoisted(() => ({ maps: [] as unknown[] }));

vi.mock('maplibre-gl', () => {
  class FakeMap {
    handlers = new Map<string, Array<(...args: unknown[]) => void>>();
    sources = new Map<string, unknown>();
    layers = new Map<string, { id: string; type?: string }>();
    styleLayers = [
      { id: 'water', type: 'fill' },
      { id: 'labels', type: 'symbol' },
    ];

    constructor() {
      maps.push(this);
    }

    addControl() {}
    on(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
      return this;
    }
    once(event: string, handler: (...args: unknown[]) => void) {
      const onceHandler = (...args: unknown[]) => {
        this.off(event, onceHandler);
        handler(...args);
      };
      return this.on(event, onceHandler);
    }
    off(event: string, handler: (...args: unknown[]) => void) {
      this.handlers.set(
        event,
        (this.handlers.get(event) ?? []).filter((registered) => registered !== handler),
      );
      return this;
    }
    fire(event: string, ...args: unknown[]) {
      for (const handler of [...(this.handlers.get(event) ?? [])]) handler(...args);
      return this;
    }
    addSource(id: string, definition: { type: string }) {
      this.sources.set(
        id,
        definition.type === 'image'
          ? { updateImage: vi.fn() }
          : { setData: vi.fn(), getClusterExpansionZoom: vi.fn() },
      );
    }
    getSource(id: string) {
      return this.sources.get(id);
    }
    addLayer(layer: { id: string; type: string }) {
      this.layers.set(layer.id, layer);
      this.styleLayers.push(layer);
    }
    getLayer(id: string) {
      return this.layers.get(id);
    }
    getStyle(): { layers: Array<{ id: string; type?: string }> } {
      return { layers: this.styleLayers };
    }
    setLayoutProperty() {}
    setPaintProperty() {}
    setFilter() {}
    hasImage() {
      return true;
    }
    addImage() {}
    queryRenderedFeatures() {
      return [];
    }
    getCanvas() {
      return { style: { cursor: '' } };
    }
    getCenter() {
      return { lat: 0, lng: 0 };
    }
    getZoom() {
      return 8;
    }
    getBearing() {
      return 0;
    }
    getPitch() {
      return 0;
    }
    getContainer() {
      return { clientHeight: 600 };
    }
    resize() {}
    remove() {}
  }

  return {
    default: {
      Map: FakeMap,
      AttributionControl: class {},
      LngLatBounds: class {},
    },
  };
});

vi.mock('@/lib/i18n', () => ({ useCopy: () => ({ map: { title: 'Map' } }) }));

function ThemeSwitch() {
  const { setPref } = useTheme();
  return <button onClick={() => setPref('dark')}>Switch to dark</button>;
}

describe('HotspotMap theme changes', () => {
  beforeEach(() => {
    maps.length = 0;
    localStorage.setItem('pavana:theme', 'light');
    document.documentElement.dataset.theme = 'light';
    vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,test');
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      fillStyle: '',
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      closePath: vi.fn(),
      fill: vi.fn(),
      getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(24 * 24 * 4) })),
    } as unknown as CanvasRenderingContext2D);
  });

  it('restores an active density raster on the map created for the new theme', async () => {
    const canvas = document.createElement('canvas');
    const density = {
      canvas,
      coords: [
        [108, 4],
        [120, 4],
        [120, -4],
        [108, -4],
      ] as [[number, number], [number, number], [number, number], [number, number]],
    };

    render(
      <ThemeProvider>
        <HotspotMap
          center={{ lat: 0, lon: 114 }}
          hotspots={[]}
          showHotspots
          showDensity
          density={density}
          onError={() => {}}
        />
        <ThemeSwitch />
      </ThemeProvider>,
    );

    await waitFor(() => expect(maps).toHaveLength(1));
    act(() => (maps[0] as TestMap).fire('style.load'));
    const firstSource = (maps[0] as TestMap).getSource('density-src');
    if (!firstSource) throw new Error('Initial density source was not created');
    await waitFor(() => expect(firstSource.updateImage).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark' }));

    await waitFor(() => expect(maps).toHaveLength(2));
    act(() => (maps[1] as TestMap).fire('style.load'));
    const recreatedSource = (maps[1] as TestMap).getSource('density-src');
    if (!recreatedSource) throw new Error('Density source was not recreated with the theme');

    await waitFor(() => expect(recreatedSource.updateImage).toHaveBeenCalledTimes(1));
  });
});
