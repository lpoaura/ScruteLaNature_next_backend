import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { BadRequestException } from '@nestjs/common';

// Types MIME autorisés par catégorie
const ALLOWED_TYPES = {
  images: ['image/jpeg', 'image/png', 'image/webp'],
  audio: ['audio/mpeg', 'audio/mp3'],
  gpx: ['application/gpx+xml', 'application/octet-stream', 'text/xml', 'application/xml'],
};

const ALL_ALLOWED = [
  ...ALLOWED_TYPES.images,
  ...ALLOWED_TYPES.audio,
  ...ALLOWED_TYPES.gpx,
];

// Détermine le sous-dossier selon le type MIME
function getSubFolder(mimetype: string): 'images' | 'audio' | 'gpx' {
  if (ALLOWED_TYPES.images.includes(mimetype)) return 'images';
  if (ALLOWED_TYPES.audio.includes(mimetype)) return 'audio';
  return 'gpx';
}

export const multerConfig = {
  storage: diskStorage({
    destination: (req, file, cb) => {
      const sub = getSubFolder(file.mimetype);
      const dest = join(process.cwd(), 'uploads', sub);
      cb(null, dest);
    },
    filename: (req, file, cb) => {
      const unique = uuidv4();
      const ext = extname(file.originalname).toLowerCase();
      cb(null, `${unique}${ext}`);
    },
  }),
  fileFilter: (req: any, file: any, cb: any) => {
    if (ALL_ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new BadRequestException(
          `Type de fichier non autorisé : ${file.mimetype}. Types acceptés : images (jpg, png, webp), audio (mp3), GPX.`,
        ),
        false,
      );
    }
  },
  limits: {
    fileSize: 20 * 1024 * 1024, // 20 Mo max
  },
};
