import getSettings from '@/lib/settings';
import type { MetadataRoute } from 'next';

const settings = await getSettings();

const robots = (): MetadataRoute.Robots => settings.robots;

export default robots;
