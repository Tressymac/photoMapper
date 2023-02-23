 // Requires 
 const parse = require('fast-csv');
 const {Storage} = require('@google-cloud/storage');
 const {Firestore} = require('@google-cloud/firestore');
 const sharp = require('sharp');
 var iconv = require('iconv-lite');
 const path = require('path');
 const fs = require('fs-extra');
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
    await fs.ensureDir(workingDir);

    storage.bucket(file.bucket).file(file.name).download({
        destination: tmpFilePath        
    }, async (err, file, apiResponse)  => {
        console.log(`File downloaded: ${tmpFilePath}`);

        // Pass the GCS object to the helper function
        await readExifData(tmpFilePath);
    
        // Delete the local version of the file 
        await fs.remove(workingDir);
    }); 
};
 
// Call the entrypoint function 
// This is not needed in the google cloud function 
// generateThumbnails();
 
// Helper functions 

async function readExifData(localFile){
    // Use the exif-async package to read the exif data
    let exifData;
    try{
        exifData = await getExif(localFile);
        console.log(exifData.gps);
    
        if (Object.keys(exifData.gps).length > 0){
           let gpsInDecimal = getGPSCoords(exifData.gps);
           console.log(gpsInDecimal);
           console.log(`Lat: ${gpsInDecimal.lat}`);
           console.log(`Lon: ${gpsInDecimal.lon}`);
           return gpsInDecimal;
        } else{
            console.log("No gps data was found in this photo");
            return null;
        }
    
    }catch(err){
        console.log(err);
        return null; 
    }
    
}

function getGPSCoords(g){
    // Parse DMS needs a string in the format of: 
    // DEGREE:MIN:SECDERICTION DEG:MIN:SECDERICTION
    const latString = `${g.GPSLatitude[0]}:${g.GPSLatitude[1]}:${g.GPSLatitude[2]}${g.GPSLatitudeRef}`;
    const lonString = `${g.GPSLongitude[0]}:${g.GPSLongitude[1]}:${g.GPSLongitude[2]}${g.GPSLongitudeRef}`;
    
    degCoords = parseDMS(`${latString} ${lonString}`);
    return degCoords;
}



 
