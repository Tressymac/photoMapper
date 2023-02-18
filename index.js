 // Requires 
 const parse = require('fast-csv');
 const {Storage} = require('@google-cloud/storage');
 const {Firestore} = require('@google-cloud/firestore');
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
 const bucketName = 'photomapper-jessymac-uploads';
  const fileName = 'AdobeStock_522623794.jpeg'; // Correct format
//  const fileName = '6v07ium5q0011.webp'; // Incorrect format image
 var canPassToreadExifData = false; 
 
 
 // My "main"/entrypoint function
exports.generateThumbnails =  async (file, context) => {
    const gcs = new Storage();
    const datafile = gcs.bucket(file.bucket).file(file.name);
    // datafile = storage.bucket(bucketName).file(fileName);
    console.log(datafile.name)
    // Creating a working driectory on pur VM to download the original fie 
        // The value of this virable will be something like ".../temp/exif"
        const workingDir = path.join(os.tmpdir(), 'exif');
        console.log(`Working ${workingDir}`);

        // Create a virable that holds a path to the local verison of the file
        const tmpFilePath = path.join(workingDir, datafile.name);
        console.log(`TmpFilepath: ${tmpFilePath}`);

        // Wait untill the working dir is ready
        fs.ensureDir(workingDir);
        if(fs.ensureDir(workingDir) != null){
            console.log(`Working directory is ready`);
        }else{
            console.log('Its not ready')
        }

        // console.log(photoFile)
        // storage.bucket(bucketName).file(fileName)
        gcs.bucket(file.bucket).file(file.name).download({
            destination: tmpFilePath        
        }, async (err, file, apiResponse)  => {
            // This stuff happens after the file is downloaded locally
            console.log(`File downloaded: ${tmpFilePath}`);
    
            // pass the local to our readExifData function 
            // const coordinates = await readExifData(tmpFilePath);
            // console.log(coordinates);
    
            // Pass the GCS object to the helper function
            // This does not read teh data in the file
            readMetadata(datafile);
    
    
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
    //  console.log(metadata);
    //  console.log(metadata.contentType);
        if (metadata.contentType === 'image/jpeg' || metadata.contentType === 'image/png'){
            console.log("yay")
            console.log(metadata.contentType)
            console.log(metadata.generation)
            // this.canPassToreadExifData = true;
        }else{
            console.log("This image format is not allowed, please upload a jpeg or a png");
            canPassToreadExifData = true;
            console.log(canPassToreadExifData)
        }

 };

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
           // Return the lat/lon object
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

 
