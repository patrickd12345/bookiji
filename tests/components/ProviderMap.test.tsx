import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProviderMap from '@/components/ProviderMap';

vi.mock('mapbox-gl', () => ({
  __esModule: true,
  default: { 
    Map: vi.fn(function (this: any) {
      this.addSource = vi.fn();
      this.addLayer = vi.fn();
      this.remove = vi.fn();
      this.on = vi.fn();
      this.off = vi.fn();
      this.queryRenderedFeatures = vi.fn(() => []);
      this.flyTo = vi.fn();
      this.loaded = vi.fn(() => true);
      this.getSource = vi.fn(() => ({ setData: vi.fn() }));
      this.getLayer = vi.fn();
      this.removeLayer = vi.fn();
      this.removeSource = vi.fn();
    }), 
    Marker: vi.fn(function (this: any) {
      return { setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis() };
    })
  },
}));

// Mock fetch globally
global.fetch = vi.fn();

describe('ProviderMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders fallback without token', () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const { getByTestId } = render(<ProviderMap />);
    expect(getByTestId('no-map')).toBeInTheDocument();
  });

  it('renders markers and filters', async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'test-token';
    (fetch as any).mockResolvedValue({
      json: async () => ({ providers: [
        { id: '1', latitude: 1, longitude: 1, category: 'hair', rating: 5 },
        { id: '2', latitude: 2, longitude: 2, category: 'massage', rating: 4 },
      ] })
    });
    const { findAllByTestId, getByTestId } = render(<ProviderMap />);
    const markers = await findAllByTestId('marker');
    expect(markers.length).toBe(2);

    (fetch as any).mockResolvedValue({
      json: async () => ({ providers: [
        { id: '1', latitude: 1, longitude: 1, category: 'hair', rating: 5 }
      ] })
    });
    fireEvent.change(getByTestId('category-filter'), { target: { value: 'hair' } });
    await new Promise(res => setTimeout(res, 0));
    const filtered = await findAllByTestId('marker');
    expect(filtered.length).toBe(1);
  });
});
