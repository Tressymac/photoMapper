 // Requires 
 const {Storage} = require('@google-cloud/storage');
 const {Firestore} = require('@google-cloud/firestore');
 const path = require('path');
 const fs = require('fs-extra');
 const os = require('os');
 const getExif = require('exif-async');
 const parseDMS = require('parse-dms');
 
 
 // Variables
 const storage = new Storage();
 const firestore = new Firestore();
 const bucketName = 'photomapper-jessymac-uploads';
 //  const fileName = 'AdobeStock_522623794.jpeg'; // Correct format
 const fileName = '6v07ium5q0011.webp'; // Incorrect format image
 var canPassToreadExifData = false; 
 
 
 // My "main"/entrypoint function
 const generateThumbnails = async () => {
     // Create a variable that points to the object in GCS
     photoFile = storage.bucket(bucketName).file(fileName);
 
     //working driectory on our VM to download the original fie 
     const workingDir = path.join(os.tmpdir(), 'exif');
     console.log(`Working ${workingDir}`);
 
     // Create a virable that holds a path to the local verison of the file
     const tmpFilePath = path.join(workingDir, photoFile.name);
     console.log(`TmpFilepath: ${tmpFilePath}`);
 
     // Wait untill the working dir is ready
     await fs.ensureDir(workingDir);
     console.log("Working directory is ready");
 
     // Download the original file to the path on local VM
     await storage.bucket(bucketName).file(fileName).download({
         destination: tmpFilePath        
     }, async (err, file, apiResponse)  => {
            console.log(`File downloaded: ${tmpFilePath}`);
            readMetadata(photoFile);
            // console.log(canPassToreadExifData)

            // Delete the local version of the file 
            await fs.remove(workingDir);
     }); 
 };
 
 // Call the entrypoint function 
 // This is not needed in the google cloud function 
//  generateThumbnails();
 
 // Helper functions 
 async function readMetadata(gcsFile) {
     const [metadata] = await gcsFile.getMetadata();
     console.log(metadata);
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
 
