// Remotion CLI config (studio + render). See https://www.remotion.dev/docs/config
import { Config } from '@remotion/cli/config';

Config.setVideoImageFormat('jpeg');
Config.setOverwriteOutput(true);
// Render speed: use the GPU path for CSS/SVG compositing and all 8 threads (about 0.07 s
// per frame on the dev machine; the 2:00 video renders in roughly 5 minutes).
Config.setChromiumOpenGlRenderer('angle');
Config.setConcurrency(8);
