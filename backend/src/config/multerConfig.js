import multer from 'multer';
import fs from 'fs';
import path from 'path';

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const sanitizedFilename = path.basename(file.originalname);
        const filePath = path.join(uploadDir, sanitizedFilename);
    
        if (fs.existsSync(filePath)) {
            console.warn(`Archivo duplicado detectado: ${file.originalname}. No se subirá.`);
            cb(null, false); 
        } else {
            cb(null, sanitizedFilename);
        }
    },
});

export const upload = multer({ storage: storage });
