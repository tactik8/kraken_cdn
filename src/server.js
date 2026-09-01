import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const app = express();
const PORT = 3012;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory to restrict uploads inside the project root
const BASE_UPLOAD_DIR = path.join(__dirname, 'uploads');

// Configure storage engine with dynamic nested path resolution
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 1. Extract parameter from req.params
      const paramVal = req.params.folderPath || req.params[0] || '';

      // 2. Safely join Array elements into a single path string if it's an Array
      const rawFolderPath = Array.isArray(paramVal) ? paramVal.join('/') : String(paramVal);

      // 3. Normalize and sanitize path
      const safeRelativePath = path.normalize(rawFolderPath).replace(/^(\.\.[\/\\])+/, '');
      const targetDir = path.join(BASE_UPLOAD_DIR, safeRelativePath);

      // 4. Verify target directory stays within BASE_UPLOAD_DIR
      if (!targetDir.startsWith(BASE_UPLOAD_DIR)) {
        return cb(new Error('Invalid destination path: Outside allowed upload directory.'), null);
      }

      // 5. Create directories recursively
      await fs.mkdir(targetDir, { recursive: true });

      cb(null, targetDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

app.get('/', (req, res) => {
  res.status(200).json({
    uploadDirectory: BASE_UPLOAD_DIR
  });
});

app.post('/api/upload/single/*folderPath', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { originalname, filename, path: filePath, size } = req.file;

  // Convert array to string for response display
  const folderStr = Array.isArray(req.params.folderPath)
    ? req.params.folderPath.join('/')
    : req.params.folderPath;

  res.status(200).json({
    message: `File uploaded successfully to path '/${folderStr}'`,
    file: {
      originalName: originalname,
      storedName: filename,
      path: filePath,
      size
    }
  });
});

// FIXED: Named wildcard parameter /*folderPath
app.post('/api/upload/multiple/*folderPath', upload.array('files', 5), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded.' });
  }

  const uploadedFiles = req.files.map(({ originalname, filename, path: filePath, size }) => ({
    originalName: originalname,
    storedName: filename,
    path: filePath,
    size
  }));

  res.status(200).json({
    message: `Files uploaded successfully to path '/${req.params.folderPath}'`,
    files: uploadedFiles
  });
});

// Global error handler
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(500).json({ error: err.message });
  }
  next();
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});