import { render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProviderMap from '@/components/ProviderMap';

vi.mock('mapbox-gl', () => ({
  default: { Map: class { constructor(){} remove(){} }, Marker: class { setLngLat(){return this;} addTo(){return this;} } },
  Map: class { constructor(){} remove(){} },
  Marker: class { setLngLat(){return this;} addTo(){return this;} }
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
