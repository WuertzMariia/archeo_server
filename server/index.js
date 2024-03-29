// const bodyParser = require('body-parser');
// python run_alicevision.py build_files_1 my_img_set "Meshroom-2018.1.0-win7-64\\aliceVision\\bin\\" 6 runall
// npm run dev, npm start
// http://filmicworlds.com/blog/command-line-photogrammetry-with-alicevision/
// https://threejs.org/examples/?q=obj#webgl_loader_obj/
// https://github.com/mrdoob/three.js/blob/master/examples/webgl_loader_obj.html
// python run_alicevision.py build_files_1 my_img_set "Meshroom-2018.1.0-win7-64\\
// aliceVision\\bin\\" 34 runall
const bodyParser = require('body-parser');
const pidusage = require('pidusage');
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
const { exec } = require('child_process');
const THREE = require('three');
const { OBJLoader } = require('@loaders.gl/obj');
const { load } = require('@loaders.gl/core');

let videoMetaData = null;

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
    let videoMetaDataObj;
    // C:\Users\marii\OneDrive\Desktop\projects\server\uploads\1710179214623-sandstein_saeule_2023.mp4
    const videoMetadata = async () => await renderer.getVideoMetadata("C:\\Users\\marii\\OneDrive\\Desktop\\projects\\server\\uploads\\1710179214623-sandstein_saeule_2023.mp4").then(r => {
        videoMetaDataObj = r;
        res.json({videoMetaDataObj: videoMetaDataObj, file: req.file});
        videoMetaData = videoMetaDataObj;
    });
    videoMetadata();

})

/**
 * Extract frames and save frames in archive
 */
app.post("/extract", cors(), (req, res, next) => {
    console.log("videoMetaData:", videoMetaData)
    if (!req.body.file) {
        const error = new Error('No file name provided')
        error.httpStatusCode = 400
        return next(error)
    }
// extract 3 frames at 1s, 2s, and 3.5s respectively

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

                        // Select one frame from every X frames
                        console.log("videoMetaData.fps: ",videoMetaData.fps)
                        for (let i = 0; i < files.length; i += videoMetaData.fps) {
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

                        setTimeout(() => {

// The directory of the frames
                            const inputDir = req.body.fileName;

// The directory to save the selected frames
                            const outputDir = './' + inputDir + '_key_frames';
                            let inputDirectory = path.join(__dirname, '..', outputDir);
                            let outputDirectory = path.join(__dirname, '..', outputDir, 'meshroom_result');

                            exec(`"${__dirname}\\Meshroom-2023.3.0\\Meshroom.exe" -i "${inputDirectory}" -o "${outputDirectory}" && explorer "${outputDirectory}"`, (error, stdout, stderr) => {
                                if (error) {
                                    console.error(`exec error: ${error}`);
                                    return;
                                }
                                console.log("START MESHROOM")
                            });
                        }, 5000)
                    });

//                     console.log("ARCHIVE starts")
//                     // arch.append(req.body.fileName, { name: 'req.body.fileName'});
//                     const output = fs.createWriteStream(__dirname + "/" + req.body.fileName + 'zip.zip');
//                     const archive = archiver('zip');
//                     output.on('close', function () {
//                         console.log(archive.pointer() + ' total bytes');
//                         console.log('archiver has been finalized and the output file descriptor has closed.');
//                     });
//
//
// // This event is fired when the data source is drained no matter what was the data source.
// // It is not part of this library but rather from the NodeJS Stream API.
// // @see: https://nodejs.org/api/stream.html#stream_event_end
//                     output.on('end', function () {
//                         console.log('Data has been drained');
//                     });
//
// // good practice to catch warnings (ie stat failures and other non-blocking errors)
//                     archive.on('warning', function (err) {
//                         if (err.code === 'ENOENT') {
//                             // log warning
//                         } else {
//                             // throw error
//                             throw err;
//                         }
//                     });
//
// // good practice to catch this error explicitly
//                     archive.on('error', function (err) {
//                         throw err;
//                     });
//
// // pipe archive data to the file
//                     archive.pipe(output);
//                     const options = {
//                         root: path.join(__dirname)
//                     };
//                     let filename = `${__dirname + '\\' + req.body.fileName + 'zip.zip'}`;
//                     // append files from a sub-directory and naming it `new-subdir` within the archive
//                     archive.directory(outputDir, false);
//                     archive.finalize().then(r => {
//                         let fileNameComplete = req.body.fileName + 'zip.zip';
//                         console.log(fileNameComplete)
//                         res.json({fileNameComplete: fileNameComplete});
//                     });

                }, "1000");


            })
            .run();
    }

    // getFrames().then(r => {
    //     console.log("getFrames ready")
    // })


    const pythonScript = 'run_alicevision.py';
    const dataset = 'sandstein_saule_0_4_64_output';
    const meshroomPath = 'Meshroom-2018.1.0-win7-64\\aliceVision\\bin\\';
    const parameters = '34 runall';
    //rename
    const command = `python run_alicevision.py sandstein_saule_0_1_256_output sandstein_saule_0_1_256 "Meshroom-2018.1.0-win7-64\\aliceVision\\bin" 256 runall`;
    let resourceData = {
        cpu: [],
        memory: [],
    };

    let elapsTime;

    const startTime = new Date().getTime();
    const childProcess = exec(command, { maxBuffer: 8192 * 1024 * 4 }, (error, stdout, stderr) => {
        if (error) {
            console.error(`exec error: ${error}`);
            return;
        }
        const endTime = new Date().getTime();
        console.log('Script output:', stdout);
        console.error('Script errors:', stderr);

        console.log('START python script');

        // Calculate the elapsed time
        elapsTime = endTime - startTime;
        console.log(`Process took ${elapsTime} milliseconds`);
        // Continue with any further processing or actions here
    });

// Capture the script's output in real-time
    childProcess.stdout.on('data', (data) => {
        console.log(`stdout: ${data}`);
    });

    childProcess.stderr.on('data', (data) => {
        console.error(`stderr: ${data}`);
    });

    // Monitor CPU and memory usage
    const intervalId = setInterval(() => {
        pidusage(childProcess.pid, (err, stats) => {
            if (err) {
                console.error(`pidusage error: ${err}`);
                return;
            }

            // Add CPU and memory usage data to the object
            resourceData.cpu.push({ timestamp: new Date().toISOString(), value: stats.cpu.toFixed(2) });
            resourceData.memory.push({ timestamp: new Date().toISOString(), value: stats.memory / (1024 * 1024) });
        });
    }, 1000); // Check every second, adjust the interval as needed


// Wait for the script to complete
    childProcess.on('exit', (code) => {
        console.log(`Child process exited with code ${code}`);

        // Stop monitoring after script completion
        clearInterval(intervalId);

        // Calculate the average CPU and memory usage
        const avgCpuUsage = calculateAverage(resourceData.cpu);
        const avgMemoryUsage = calculateAverage(resourceData.memory);
// Save data to a JSON file
        saveDataToFile(resourceData, avgCpuUsage, avgMemoryUsage);
        // Log the resource data object and averages
        console.log('Resource Data:', resourceData);
        console.log('Average CPU Usage:', avgCpuUsage, '%');
        console.log('Average Memory Usage:', avgMemoryUsage, 'MB');


        // Perform any cleanup or further actions here
    });
// Helper function to calculate average
    function calculateAverage(dataArray) {
        if (dataArray.length === 0) return 0;

        const sum = dataArray.reduce((acc, data) => acc + parseFloat(data.value), 0);
        return sum / dataArray.length;
    }

    // Helper function to save data to a JSON file
    function saveDataToFile(data, avgCpu, avgMemory) {
        const result = {
            resourceData: data,
            averageCpuUsage: avgCpu,
            averageMemoryUsage: avgMemory,
            elapsTime: elapsTime,
        };

        //rename
        const fileName = 'sandstein_saule_0_1_256.json';

        fs.writeFile(fileName, JSON.stringify(result, null, 2), (err) => {
            if (err) {
                console.error(`Error writing to ${fileName}: ${err}`);
            } else {
                console.log(`Data saved to ${fileName}`);
            }
        });
    }
    // exec(`python "${__dirname}\\run_alicevision.py" "${__dirname}\\build_files_4" "${__dirname}\\my_img_set" "Meshroom-2018.1.0-win7-64\\aliceVision\\bin\\" 34 runall`, (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`exec error: ${error}`);
    //         return;
    //     }
    //     console.log("START MESHROOM");
    // });
    // exec(`"${__dirname}\\Meshroom-2023.3.0\\Meshroom.exe" -i "${inputDirectory}" -o "${outputDirectory}" && explorer "${outputDirectory}"`, (error, stdout, stderr) => {
    //     if (error) {
    //         console.error(`exec error: ${error}`);
    //         return;
    //     }
    //     console.log("START MESHROOM")
    // });
});


/**
 * Download archive with frames
 */
app.post("/download", cors(), (req, res, next) => {
    if (!req.body.archiveName) {
        const error = new Error('No archive name provided')
        error.httpStatusCode = 400
        return next(error)
    }
    const filePath = path.join(__dirname, req.body.archiveName);
    const fileName = `${'attachment; filename=' + req.body.archiveName}`;
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

