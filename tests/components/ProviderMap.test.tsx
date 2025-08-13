import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProviderMap from '@/components/ProviderMap';

var MapMock = vi.fn(function () {
  this.addSource = vi.fn();
  this.addLayer = vi.fn();
  this.remove = vi.fn();
});
var MarkerMock = vi.fn(function () {
  return { setLngLat: vi.fn().mockReturnThis(), addTo: vi.fn().mockReturnThis() };
});
vi.mock('mapbox-gl', () => ({
  __esModule: true,
  default: { Map: MapMock, Marker: MarkerMock },
}));

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
    expect(MapMock).toHaveBeenCalled();

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
