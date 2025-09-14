import { Injectable } from '@angular/core';
import { Observable, from } from 'rxjs';

export interface FileExportOptions {
  filename: string;
  format: 'xml' | 'svg' | 'png' | 'json';
  content: string | Blob;
  mimeType?: string;
}

export interface FileImportResult {
  filename: string;
  content: string;
  size: number;
  lastModified: Date;
}

@Injectable({
  providedIn: 'root'
})
export class FileService {

  constructor() {}

  /**
   * Exports content as a downloadable file
   */
  exportFile(options: FileExportOptions): void {
    const { filename, format, content, mimeType } = options;

    // Determine MIME type if not provided
    const finalMimeType = mimeType || this.getMimeTypeForFormat(format);

    // Create blob from content
    const blob = content instanceof Blob ? content : new Blob([content], { type: finalMimeType });
    
    // Create download URL
    const url = window.URL.createObjectURL(blob);

    // Create and trigger download
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = this.ensureFileExtension(filename, format);
    downloadLink.style.display = 'none';

    // Append to body, click, and clean up
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);

    // Clean up the URL after a short delay
    setTimeout(() => window.URL.revokeObjectURL(url), 100);
  }

  /**
   * Imports a file from user selection
   */
  importFile(fileTypes: string[] = ['.xml', '.bpmn']): Observable<FileImportResult> {
    return new Observable(subscriber => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = fileTypes.join(',');
      fileInput.style.display = 'none';

      fileInput.onchange = (event: any) => {
        const file = event.target.files[0];
        if (file) {
          const reader = new FileReader();
          
          reader.onload = (e: any) => {
            const result: FileImportResult = {
              filename: file.name,
              content: e.target.result,
              size: file.size,
              lastModified: new Date(file.lastModified)
            };
            
            subscriber.next(result);
            subscriber.complete();
            document.body.removeChild(fileInput);
          };

          reader.onerror = () => {
            subscriber.error(new Error('Failed to read file'));
            document.body.removeChild(fileInput);
          };

          reader.readAsText(file);
        } else {
          subscriber.complete();
          document.body.removeChild(fileInput);
        }
      };

      fileInput.oncancel = () => {
        subscriber.complete();
        document.body.removeChild(fileInput);
      };

      document.body.appendChild(fileInput);
      fileInput.click();
    });
  }

  /**
   * Validates file content based on format
   */
  validateFileContent(content: string, format: 'xml' | 'json'): { isValid: boolean; error?: string } {
    try {
      switch (format) {
        case 'xml':
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          const parseError = xmlDoc.getElementsByTagName('parsererror');
          
          if (parseError.length > 0) {
            return {
              isValid: false,
              error: 'Invalid XML format'
            };
          }
          break;

        case 'json':
          JSON.parse(content);
          break;
      }

      return { isValid: true };
    } catch (error) {
      return {
        isValid: false,
        error: `Invalid ${format.toUpperCase()} format: ${error}`
      };
    }
  }

  /**
   * Gets the appropriate MIME type for a given format
   */
  private getMimeTypeForFormat(format: string): string {
    const mimeTypes: { [key: string]: string } = {
      'xml': 'text/xml',
      'svg': 'image/svg+xml',
      'png': 'image/png',
      'json': 'application/json',
      'bpmn': 'text/xml'
    };

    return mimeTypes[format] || 'text/plain';
  }

  /**
   * Ensures the filename has the correct extension
   */
  private ensureFileExtension(filename: string, format: string): string {
    const extension = `.${format}`;
    
    if (filename.toLowerCase().endsWith(extension)) {
      return filename;
    }

    // Remove existing extension if present
    const dotIndex = filename.lastIndexOf('.');
    const baseName = dotIndex > 0 ? filename.substring(0, dotIndex) : filename;
    
    return `${baseName}${extension}`;
  }

  /**
   * Generates a timestamped filename
   */
  generateTimestampedFilename(baseName: string, format: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    return `${baseName}_${timestamp}.${format}`;
  }

  /**
   * Converts canvas to blob for image export
   */
  canvasToBlob(canvas: HTMLCanvasElement, format: 'png' | 'jpeg' = 'png', quality?: number): Observable<Blob> {
    return from(new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert canvas to blob'));
          }
        },
        `image/${format}`,
        quality
      );
    }));
  }

  /**
   * Creates a backup of the current state
   */
  createBackup(content: any, metadata?: any): void {
    const backupData = {
      content,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        version: '1.0'
      }
    };

    const filename = this.generateTimestampedFilename('diagram_backup', 'json');
    
    this.exportFile({
      filename,
      format: 'json',
      content: JSON.stringify(backupData, null, 2)
    });
  }

  /**
   * Reads multiple files at once
   */
  importMultipleFiles(fileTypes: string[] = ['.xml', '.bpmn']): Observable<FileImportResult[]> {
    return new Observable(subscriber => {
      const fileInput = document.createElement('input');
      fileInput.type = 'file';
      fileInput.accept = fileTypes.join(',');
      fileInput.multiple = true;
      fileInput.style.display = 'none';

      fileInput.onchange = (event: any) => {
        const files = Array.from(event.target.files) as File[];
        if (files.length === 0) {
          subscriber.complete();
          document.body.removeChild(fileInput);
          return;
        }

        const results: FileImportResult[] = [];
        let completedCount = 0;

        files.forEach(file => {
          const reader = new FileReader();
          
          reader.onload = (e: any) => {
            results.push({
              filename: file.name,
              content: e.target.result,
              size: file.size,
              lastModified: new Date(file.lastModified)
            });

            completedCount++;
            if (completedCount === files.length) {
              subscriber.next(results);
              subscriber.complete();
              document.body.removeChild(fileInput);
            }
          };

          reader.onerror = () => {
            subscriber.error(new Error(`Failed to read file: ${file.name}`));
            document.body.removeChild(fileInput);
          };

          reader.readAsText(file);
        });
      };

      fileInput.oncancel = () => {
        subscriber.complete();
        document.body.removeChild(fileInput);
      };

      document.body.appendChild(fileInput);
      fileInput.click();
    });
  }
}
