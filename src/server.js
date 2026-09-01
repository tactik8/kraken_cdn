import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const app = express();
const PORT = 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Base directory to restrict uploads inside the project root
const BASE_UPLOAD_DIR = path.join(__dirname, 'uploads');

// Configure storage engine with dynamic nested path resolution
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // Get wildcard match from URL params or default to empty string
      const rawFolderPath = req.params[0] || req.params.folderPath || '';

      // Normalize and sanitize path to prevent Directory Traversal attacks (e.g. ../../)
      const safeRelativePath = path.normalize(rawFolderPath).replace(/^(\.\.[\/\\])+/, '');
      const targetDir = path.join(BASE_UPLOAD_DIR, safeRelativePath);

      // Verify target directory remains inside BASE_UPLOAD_DIR
      if (!targetDir.startsWith(BASE_UPLOAD_DIR)) {
        return cb(new Error('Invalid destination path: Outside allowed upload directory.'), null);
      }

      // Create deeply nested directories if they don't exist
      await fs.mkdir(targetDir, { recursive: true });

      cb(null, targetDir);
    } catch (err) {
      cb(err, null);
    }
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }
});

// Route for single file upload with variable nested subfolders
// Wildcard '*' matches any depth: /api/upload/single/folder1/folder2/folder3
app.post('/api/upload/single/*', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded.' });
  }

  const { originalname, filename, path: filePath, size } = req.file;

  res.status(200).json({
    message: `File uploaded successfully to path '/${req.params[0]}'`,
    file: {
      originalName: originalname,
      storedName: filename,
      path: filePath,
      size
    }
  });
});

// Route for multiple file uploads with variable nested subfolders
app.post('/api/upload/multiple/*', upload.array('files', 5), (req, res) => {
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
    message: `Files uploaded successfully to path '/${req.params[0]}'`,
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