// const bodyParser = require('body-parser');
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
// import {getVideoMetadata} from "@remotion/renderer";

ffmpeg.setFfmpegPath(ffmpegPath);

ffmpeg({source: "myVideo.mp4"}).takeScreenshots({filename: "example.png", timemarks: [1 ,2 ,3 ,4]}, ".");
