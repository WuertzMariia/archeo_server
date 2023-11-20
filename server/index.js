const express = require("express");
const cors = require('cors');
const extractFrames = require('ffmpeg-extract-frames')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');
ffmpeg.setFfmpegPath(ffmpegPath);

const PORT = process.env.PORT || 3001;
const app = express();

app.set('view engine', 'ejs');
app.use(cors());

// Require the upload middleware
const upload = require('./upload');

app.post('/upload', upload.single('file'), function (req, res, next) {
    if (!req.file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }

    // res.json({file: req.file});
    res.json({file: req.file});
})

app.get("/api", cors(), (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.json({message: "Server is working and ready to accept video files!"});


// extract 3 frames at 1s, 2s, and 3.5s respectively
//     let func = async () => await extractFrames({
//         input: 'video1.mp4',
//         output: './screenshot-%i.jpg',
//         offsets: [
//             1000,
//             2000,
//             3500
//         ]
//     })
//
//     func().then(r => console.log(r))
});

app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

