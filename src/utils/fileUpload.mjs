import { v2 as cloudinary } from 'cloudinary';
import fs from "fs"

cloudinary.config({ 
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY, 
    api_secret: process.env.CLOUDINARY_API_SECRET
});


const uploadOnCloudinary = async (filePath) => {
    try{
        if(!filePath) return "File Path not found"

        const response = await cloudinary.uploader.upload(filePath, {
            resource_type: "auto"
        })
        fs.unlinkSync(filePath)
        return response
    }
    catch(error){
        fs.unlinkSync(filePath) // remove the file if the operation fail
        return null;
    }
}

export {uploadOnCloudinary}