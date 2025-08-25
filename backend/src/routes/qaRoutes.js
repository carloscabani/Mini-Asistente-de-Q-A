import { Router } from 'express';
import { upload } from '../config/multerConfig.js';
import { ingestController, searchController, askController } from '../controllers/qaController.js';

const router = Router();

// Ruta para los endpoints
router.post('/ingest', upload.array('files', 10), ingestController);
router.get('/search', searchController);
router.post('/ask', askController);

export default router;