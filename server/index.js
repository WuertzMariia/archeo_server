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
const renderer = require('@remotion/renderer');
ffmpeg.setFfmpegPath(ffmpegPath);
const PORT = process.env.PORT || 3001;
const app = express();
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.set('view engine', 'ejs');
app.use(cors());
// Require the upload middleware
const upload = require('./upload');

/**
 * Upload video
 */
app.post('/upload', upload.single('file'), function (req, res, next) {
    if (!req.file) {
        const error = new Error('Please upload a file')
        error.httpStatusCode = 400
        return next(error)
    }

    // res.json({file: req.file});
    console.log(req.file)
    let videoMetaDataObj;
    const videoMetadata = async () => await renderer.getVideoMetadata(req.file.path).then(r => {
        videoMetaDataObj = r;
        res.json({videoMetaDataObj: videoMetaDataObj, file: req.file});
    });
    videoMetadata();

})

/**
 * Extract frames and save frames in archive
 */
app.post("/extract", cors(), (req, res, next) => {
    console.log(req.body)
    if (!req.body.file) {
        const error = new Error('No file name provided')
        error.httpStatusCode = 400
        return next(error)
    }
// extract 3 frames at 1s, 2s, and 3.5s respectively

    console.log(req.body.file)
    let arrayOffset = []
    for (let i = 1; i <= req.body.duration; i++) {
        arrayOffset.push((i * 1000) - 500)
    }

    let getFrames = async () => {
        !fs.existsSync(req.body.fileName) && fs.mkdirSync(req.body.fileName);

        // await extractFrames({
        //     input: req.body.file,
        //     output: req.body.fileName + '/screenshot-%i.jpg',
        //     offsets: null, //every frame
        //     quality: 50
        // })

        await ffmpeg(req.body.file)
            .outputOptions('-q:v 2') // set the quality of the output JPEGs to 2 (highest quality)
            .output(req.body.fileName + '/screenshot-%d.jpg') // use a pattern for the output file names
            .on('end', function () {
                console.log('Finished processing');

                setTimeout(() => {
                    console.log("Delayed for 1 second.");
                    console.log("START selecting 1 frame per second")

// The directory of the frames
                    const inputDir = req.body.fileName;

// The directory to save the selected frames
                    const outputDir = './' + inputDir + '_key_frames';

// Create the output directory if it doesn't exist
                    if (!fs.existsSync(outputDir)) {
                        fs.mkdirSync(outputDir);
                    }

// Read the directory of the frames
                    fs.readdir(inputDir, (err, files) => {
                        if (err) {
                            console.error('Error reading directory:', err);
                            return;
                        }

                        // Sort the files by their frame numbers
                        files.sort((a, b) => {
                            const frameNumberA = parseInt(a.split('-')[1].split('.')[0]);
                            const frameNumberB = parseInt(b.split('-')[1].split('.')[0]);
                            return frameNumberA - frameNumberB;
                        });

                        // Select one frame from every 25 frames
                        for (let i = 0; i < files.length; i += 25) {
                            const file = files[i];

                            // The path of the frame
                            const filePath = path.join(inputDir, file);

                            // The path to save the frame
                            const outputPath = path.join(outputDir, file);

                            // Copy the frame to the new directory
                            fs.copyFile(filePath, outputPath, (err) => {
                                if (err) {
                                    console.error('Error copying file:', err);
                                } else {
                                    console.log('Copied file:', file);
                                }
                            });
                        }
                    });

                    console.log("ARCHIVE starts")
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
                    archive.directory(outputDir, false);
                    archive.finalize().then(r => {
                        let fileNameComplete = req.body.fileName + 'zip.zip';
                        console.log(fileNameComplete)
                        res.json({fileNameComplete: fileNameComplete});
                    });
                }, "1000");

            })
            .run();
    }

    getFrames().then(r => {
        console.log("READY")
    })
});


/**
 * Download archive with frames
 */
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

/**
 * Test get request to check server respond
 */
app.get("/api", cors(), (req, res) => {
    res.set('Access-Control-Allow-Origin', '*');
    res.set('Access-Control-Allow-Headers', '*');
    res.json({message: "Server is working and ready to accept video files!"});
});


app.listen(PORT, () => {
    console.log(`Server listening on ${PORT}`);
});

