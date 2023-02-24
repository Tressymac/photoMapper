 // Requires 
 const parse = require('fast-csv');
 const {Storage} = require('@google-cloud/storage');
 const {Firestore} = require('@google-cloud/firestore');
 const sharp = require('sharp');
 var iconv = require('iconv-lite');
 const path = require('path');
 const fs = require('fs-extra');
 const csv = require('csv-parser');
//  const fs = require('fs');
 const os = require('os');
 const getExif = require('exif-async');
 const parseDMS = require('parse-dms');
 
 
// Variables
const storage = new Storage();
const firestore = new Firestore();
const fileName = 'AdobeStock_522623794.jpeg'; // Correct format
//  const fileName = '6v07ium5q0011.webp'; // Incorrect format image
const secondBucketName = storage.bucket('photomapper-jessymac-uploads');
const bucketName = 'photomapper-jessymac-uploads';
const thumbNailBucket = storage.bucket('photomapper-jessymac-thumbnails');
const finalBucket = storage.bucket('photomapper-jessymac-imagesfinal');
 
// My "main"/entrypoint function
exports.generateThumbnails =  async (file, context) => {
    const datafile = storage.bucket(file.bucket).file(file.name);
    // datafile = storage.bucket(bucketName).file(fileName);
    console.log(datafile.name);

    // Creating a working driectory on our VM to download the original fie 
    const workingDir = path.join(os.tmpdir(), 'exif');
    console.log(`Working ${workingDir}`);

    // Create a variable that holds a path to the local verison of the file
    const tmpFilePath = path.join(workingDir, datafile.name);
    console.log(`TmpFilepath: ${tmpFilePath}`);

    // Wait untill the working dir is ready
    fs.ensureDir(workingDir);

    storage.bucket(file.bucket).file(file.name).download({
        destination: tmpFilePath        
    }, async (err, file, apiResponse)  => {
        // This stuff happens after the file is downloaded locally
        console.log(`File downloaded: ${tmpFilePath}`);

        // Pass the GCS object to the helper function
        await readMetadata(datafile);
    
        // Delete the local version of the file 
        await fs.remove(workingDir);
    }); 
};
 
// Call the entrypoint function 
// This is not needed in the google cloud function 
// generateThumbnails();
 
// Helper functions 
async function readMetadata(gcsFile) {
    const [metadata] = await gcsFile.getMetadata();
    if (metadata.contentType === 'image/jpeg' || metadata.contentType === 'image/png'){
        let shortContent = metadata.contentType.slice(6);
        let newName = `${metadata.generation}.${shortContent}`;   
        console.log(`My new name is ${newName}`);         
        const name = metadata.name;
        await downloadNewFile(name, newName, gcsFile);
    }
    else{
        console.log("This image format is not allowed, please upload a jpeg or a png");
        console.log(canPassToreadExifData);
    }
};

const downloadNewFile = async (name, newName, gcsFile) => {
    // Create a new virable that holds a path to the local verison of the file with the new name
    console.log("This is the new name: " + newName);
    const newWorkingDir = path.join(os.tmpdir(), 'exifNew');
    const newTmpFilePath = path.join(newWorkingDir, `Image${newName}`);
    console.log(`New TmpFilepath: ${newTmpFilePath}`); 
    await fs.ensureDir(newWorkingDir);
    const options = {
        destination: newTmpFilePath,
    };
    console.log("This is the name that I am passing in: " + name);
    await storage.bucket(bucketName).file(gcsFile.name).download(options); 
    console.log('This is after the new download');
    await finalBucket.upload(newTmpFilePath);
    console.log("Photo uploded to new bucket")
    
    // Declear an array of thumbnail sizes 
    const sizes = [64, 256];
    await Promise.all( sizes.map( async (size) => {
        // This function resizes the image and saves the thumbnail locally

        // Create a name for the thumbnail image
        const thumbName = `thumb@${size}_${newName}`;

        // Create a path where we will store the thumbnail iamage locally 
        const thumbPath = path.join(newWorkingDir, thumbName)
        console.log("Thumb Path: " + thumbPath)

        // Use the sharp libary to generate the thumbnail image and save it to the thumbpath
        // Then uplode the thumbnail to the thumbBucket in cloud storage
        await sharp(newTmpFilePath).resize(size).toFile(thumbPath).then( async () => {
            console.log(`Resize complete: ${thumbName}`);
            await thumbNailBucket.upload(thumbPath);
            console.log(`Upload complete: ${thumbPath}`);
        });
    }));

    //Delete the original file uploaded to the "uploads" bucket
    await secondBucketName.file(gcsFile.name).delete();
    console.log("Deleting image file after upload: " + secondBucketName);
         

    await fs.remove(newWorkingDir);

};





 
