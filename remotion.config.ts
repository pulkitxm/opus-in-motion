import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setJpegQuality(95);
Config.setChromiumOpenGlRenderer("angle");
Config.setCodec("h264");
Config.setCrf(16);
Config.setColorSpace("bt709");
Config.setPixelFormat("yuv420p");
Config.setAudioCodec("aac");
Config.setAudioBitrate("320k");
