import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import Busboy from 'busboy';
import type { Readable } from 'node:stream';
import { UploadService } from './upload.service';

@Controller('uploads')
export class UploadController {
  constructor(private readonly uploads: UploadService) {}

  @Post()
  async upload(@Req() req: Request): Promise<{ uploadId: string }> {
    return new Promise((resolve, reject) => {
      const bb = Busboy({
        headers: req.headers,
        limits: { files: 1, fileSize: 2 * 1024 ** 3 }, // 1 arquivo, até 2GB
      });

      bb.on(
        'file',
        (_field: string, fileStream: Readable, info: Busboy.FileInfo) => {
          // Cria o registro do upload e responde JÁ com o id (202-style):
          // o processamento segue em background; o client acompanha via GET /uploads/:id
          this.uploads
            .startProcessing(info.filename, fileStream)
            .then((uploadId) => resolve({ uploadId }))
            .catch(reject);
        },
      );

      bb.on('error', reject);
      req.pipe(bb);
    });
  }

  @Get()
  list() {
    return this.uploads.list();
  }

  @Get(':id')
  async status(@Param('id') id: string) {
    const upload = await this.uploads.findById(id);
    if (!upload) throw new NotFoundException();
    return upload; // status, detected_format, total/parsed/error_lines
  }
}
