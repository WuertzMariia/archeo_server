// const bodyParser = require('body-parser');
const bodyParser = require('body-parser');
const express = require("express");
const cors = require('cors');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const extractFrames = require('ffmpeg-extract-frames')
const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;
const ffmpeg = require('fluent-ffmpeg');

ffmpeg.setFfmpegPath(ffmpegPath);
const PORT = process.env.PORT || 3001;
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
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

app.post("/extract", cors(), (req, res, next) => {
    console.log(req.body)
    if (!req.body.file) {
        const error = new Error('No file name provided')
        error.httpStatusCode = 400
        return next(error)
    }
// extract 3 frames at 1s, 2s, and 3.5s respectively
    let func = async () => {
        !fs.existsSync(req.body.fileName) && fs.mkdirSync(req.body.fileName);
        await extractFrames({
            input: req.body.file,
            output: req.body.fileName + '/screenshot-%i.jpg',
            offsets: [
                1000,
                2000,
                3500
            ]
        })
    }

    func().then(r => {
        // arch.append(req.body.fileName, { name: 'req.body.fileName'});
        const output = fs.createWriteStream(__dirname + "/" + req.body.fileName + 'zip.zip');
        const archive = archiver('zip');
        output.on('close', function () {
            console.log(archive.pointer() + ' total bytes');
            console.log('archiver has been finalized and the output file descriptor has closed.');
        });


// This event is fired when the data source is drained no matter what was the data source.
// It is not part of this library but rather from the NodeJS Stream API.
// @see: https://nodejs.org/api/stream.html#stream_event_end
        output.on('end', function () {
            console.log('Data has been drained');
        });

// good practice to catch warnings (ie stat failures and other non-blocking errors)
        archive.on('warning', function (err) {
            if (err.code === 'ENOENT') {
                // log warning
            } else {
                // throw error
                throw err;
            }
        });

// good practice to catch this error explicitly
        archive.on('error', function (err) {
            throw err;
        });

// pipe archive data to the file
        archive.pipe(output);
        const options = {
            root: path.join(__dirname)
        };
        let filename = `${__dirname + '\\' + req.body.fileName + 'zip.zip'}`;
        // append files from a sub-directory and naming it `new-subdir` within the archive
        archive.directory(req.body.fileName, false);
        archive.finalize().then(r => {
            let fileNameComplete = req.body.fileName + 'zip.zip';
            console.log(fileNameComplete)
            res.json({fileNameComplete: fileNameComplete});
        });
    })

});

app.post("/download", cors(), (req, res, next) => {
    console.log(req.body)
    if (!req.body.archiveName) {
        const error = new Error('No archive name provided')
        error.httpStatusCode = 400
        return next(error)
    }
    const filePath = path.join(__dirname, req.body.archiveName);
    const fileName = `${'attachment; filename=' + req.body.archiveName}`;
    console.log(fileName)
    console.log(filePath)
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', fileName);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error sending file:', err);
            res.status(500).send('Internal Server Error');
        }
    });
});

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

