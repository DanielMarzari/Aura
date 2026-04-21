export type Layer = {
  id: string;
  label: string;
  src: string;
  defaultVolume: number;
};

export type Scene = {
  id: string;
  name: string;
  subtitle: string;
  videoSrc: string;
  posterSrc: string;
  layers: Layer[];
};

export const scenes: Scene[] = [
  {
    id: 'rainy-forest',
    name: 'Rainy Forest',
    subtitle: 'Dusk · Pacific Northwest',
    videoSrc: '/scenes/rainy-forest/bg.mp4',
    posterSrc: '/scenes/rainy-forest/poster.jpg',
    layers: [
      { id: 'rain', label: 'Rain', src: '/scenes/rainy-forest/rain.mp3', defaultVolume: 0.75 },
      { id: 'thunder', label: 'Thunder', src: '/scenes/rainy-forest/thunder.mp3', defaultVolume: 0.3 },
      { id: 'wind', label: 'Wind', src: '/scenes/rainy-forest/wind.mp3', defaultVolume: 0.4 },
      { id: 'birds', label: 'Birds', src: '/scenes/rainy-forest/birds.mp3', defaultVolume: 0.25 },
    ],
  },
  {
    id: 'campfire-night',
    name: 'Campfire Night',
    subtitle: 'Late summer · Rockies',
    videoSrc: '/scenes/campfire-night/bg.mp4',
    posterSrc: '/scenes/campfire-night/poster.jpg',
    layers: [
      { id: 'fire', label: 'Fire', src: '/scenes/campfire-night/fire.mp3', defaultVolume: 0.7 },
      { id: 'crickets', label: 'Crickets', src: '/scenes/campfire-night/crickets.mp3', defaultVolume: 0.45 },
      { id: 'wind', label: 'Wind', src: '/scenes/campfire-night/wind.mp3', defaultVolume: 0.3 },
      { id: 'owl', label: 'Owl', src: '/scenes/campfire-night/owl.mp3', defaultVolume: 0.15 },
    ],
  },
  {
    id: 'mountain-creek',
    name: 'Mountain Creek',
    subtitle: 'Morning · Tennessee',
    videoSrc: '/scenes/mountain-creek/bg.mp4',
    posterSrc: '/scenes/mountain-creek/poster.jpg',
    layers: [
      { id: 'creek', label: 'Creek', src: '/scenes/mountain-creek/creek.mp3', defaultVolume: 0.75 },
      { id: 'birds', label: 'Birds', src: '/scenes/mountain-creek/birds.mp3', defaultVolume: 0.45 },
      { id: 'wind', label: 'Wind', src: '/scenes/mountain-creek/wind.mp3', defaultVolume: 0.3 },
      { id: 'frogs', label: 'Frogs', src: '/scenes/mountain-creek/frogs.mp3', defaultVolume: 0.2 },
    ],
  },
];

export const defaultScene = scenes[0];
export const getScene = (id: string | null | undefined): Scene =>
  scenes.find(s => s.id === id) ?? defaultScene;
