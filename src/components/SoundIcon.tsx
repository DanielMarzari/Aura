'use client';
import {
  Bell,
  Bird,
  Bug,
  CloudLightning,
  CloudRain,
  Flame,
  Music,
  Waves,
  Wind,
} from 'lucide-react';

type Props = {
  name: string;
  size?: number;
  className?: string;
};

export function SoundIcon({ name, size = 16, className }: Props) {
  const Cmp = iconFor(name);
  return <Cmp size={size} className={className} strokeWidth={1.6} />;
}

function iconFor(name: string) {
  switch (name) {
    case 'rain': return CloudRain;
    case 'thunder': return CloudLightning;
    case 'wind': return Wind;
    case 'bird':
    case 'owl': return Bird;
    case 'fire': return Flame;
    case 'water':
    case 'waves':
    case 'creek': return Waves;
    case 'cricket':
    case 'frog':
    case 'bug': return Bug;
    case 'bell':
    case 'chime':
    case 'gong': return Bell;
    case 'wolf':
    case 'coyote':
    case 'dog': return Bird;
    case 'music':
    case 'noise':
    default: return Music;
  }
}
