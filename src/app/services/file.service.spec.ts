import { TestBed } from '@angular/core/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { firstValueFrom } from 'rxjs';
import { FileService, FileExportOptions } from './file.service';

describe('FileService', () => {
  let service: FileService;
  let mockAnchor: {
    href: string;
    download: string;
    style: { display: string };
    click: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FileService);

    mockAnchor = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn()
    };

    vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor as any);
    vi.spyOn(document.body, 'appendChild').mockImplementation((node: any) => node);
    vi.spyOn(document.body, 'removeChild').mockImplementation((node: any) => node);
    vi.spyOn(window.URL, 'createObjectURL').mockReturnValue('blob:mock-url');
    vi.spyOn(window.URL, 'revokeObjectURL').mockImplementation(() => {});
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  // --- exportFile ---
  it('should create a download link and trigger click on exportFile', () => {
    const options: FileExportOptions = {
      filename: 'test',
      format: 'xml',
      content: '<xml>data</xml>'
    };

    service.exportFile(options);

    expect(document.createElement).toHaveBeenCalledWith('a');
    expect(mockAnchor.href).toBe('blob:mock-url');
    expect(mockAnchor.download).toBe('test.xml');
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
    expect(document.body.removeChild).toHaveBeenCalled();
  });

  it('should not duplicate extension if filename already has it', () => {
    const options: FileExportOptions = {
      filename: 'diagram.xml',
      format: 'xml',
      content: '<xml/>'
    };

    service.exportFile(options);
    expect(mockAnchor.download).toBe('diagram.xml');
  });

  it('should replace wrong extension with correct one', () => {
    const options: FileExportOptions = {
      filename: 'diagram.bpmn',
      format: 'json',
      content: '{}'
    };

    service.exportFile(options);
    expect(mockAnchor.download).toBe('diagram.json');
  });

  it('should pass Blob content directly to createObjectURL', () => {
    const blobContent = new Blob(['test'], { type: 'text/plain' });
    const options: FileExportOptions = {
      filename: 'test',
      format: 'xml',
      content: blobContent
    };

    service.exportFile(options);
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(blobContent);
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  // --- validateFileContent ---
  it('should validate valid XML content', () => {
    const result = service.validateFileContent('<root><child/></root>', 'xml');
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('should reject invalid XML content', () => {
    const result = service.validateFileContent('<root><unclosed>', 'xml');
    expect(result.isValid).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should validate valid JSON content', () => {
    const result = service.validateFileContent('{"key": "value"}', 'json');
    expect(result.isValid).toBe(true);
  });

  it('should reject invalid JSON content', () => {
    const result = service.validateFileContent('{invalid json}', 'json');
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Invalid JSON format');
  });

  // --- generateTimestampedFilename ---
  it('should generate a timestamped filename with correct format and extension', () => {
    const filename = service.generateTimestampedFilename('backup', 'json');
    expect(filename).toMatch(/^backup_\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.json$/);
  });

  it('should use baseName and format in generated filename', () => {
    const filename = service.generateTimestampedFilename('diagram', 'xml');
    expect(filename.startsWith('diagram_')).toBe(true);
    expect(filename.endsWith('.xml')).toBe(true);
  });

  // --- createBackup ---
  it('should call exportFile with JSON backup data', () => {
    const exportSpy = vi.spyOn(service, 'exportFile').mockImplementation(() => {});
    service.createBackup('<xml>diagram</xml>', { author: 'test' });

    expect(exportSpy).toHaveBeenCalledTimes(1);
    const callArgs = exportSpy.mock.calls[0][0];
    expect(callArgs.format).toBe('json');
    expect(callArgs.filename).toContain('diagram_backup');

    const parsed = JSON.parse(callArgs.content as string);
    expect(parsed.content).toBe('<xml>diagram</xml>');
    expect(parsed.metadata.author).toBe('test');
    expect(parsed.metadata.version).toBe('1.0');
    expect(parsed.metadata.timestamp).toBeDefined();
  });

  it('should create backup without metadata', () => {
    const exportSpy = vi.spyOn(service, 'exportFile').mockImplementation(() => {});
    service.createBackup({ data: 'test' });

    const callArgs = exportSpy.mock.calls[0][0];
    const parsed = JSON.parse(callArgs.content as string);
    expect(parsed.content).toEqual({ data: 'test' });
    expect(parsed.metadata.version).toBe('1.0');
  });

  // --- exportFile with custom mimeType ---
  it('should use custom mimeType when provided', () => {
    const options: FileExportOptions = {
      filename: 'test.xml',
      format: 'xml',
      content: '<xml/>',
      mimeType: 'application/custom'
    };
    service.exportFile(options);
    expect(window.URL.createObjectURL).toHaveBeenCalled();
    expect(mockAnchor.click).toHaveBeenCalled();
    expect(mockAnchor.download).toBe('test.xml');
  });

  // --- exportFile MIME type mapping ---
  it('should use image/svg+xml MIME type for svg format', () => {
    const options: FileExportOptions = {
      filename: 'diagram',
      format: 'svg',
      content: '<svg></svg>'
    };
    service.exportFile(options);
    expect(mockAnchor.download).toBe('diagram.svg');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  it('should use image/png MIME type for png format', () => {
    const pngBlob = new Blob(['fake-png'], { type: 'image/png' });
    const options: FileExportOptions = {
      filename: 'diagram',
      format: 'png',
      content: pngBlob
    };
    service.exportFile(options);
    expect(mockAnchor.download).toBe('diagram.png');
    expect(window.URL.createObjectURL).toHaveBeenCalledWith(pngBlob);
  });

  it('should fall back to text/plain for unknown format', () => {
    const options = {
      filename: 'data',
      format: 'txt' as any,
      content: 'hello world'
    };
    service.exportFile(options);
    expect(mockAnchor.download).toBe('data.txt');
    expect(mockAnchor.click).toHaveBeenCalled();
  });

  // --- ensureFileExtension edge cases ---
  it('should add extension to filename with no extension', () => {
    const options: FileExportOptions = {
      filename: 'myfile',
      format: 'json',
      content: '{}'
    };
    service.exportFile(options);
    expect(mockAnchor.download).toBe('myfile.json');
  });

  // --- canvasToBlob ---
  it('should resolve with a Blob when canvas.toBlob succeeds', async () => {
    const mockBlob = new Blob(['test'], { type: 'image/png' });
    const mockCanvas = {
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(mockBlob);
      })
    } as unknown as HTMLCanvasElement;

    const result = await firstValueFrom(service.canvasToBlob(mockCanvas));
    expect(result).toBe(mockBlob);
    expect(mockCanvas.toBlob).toHaveBeenCalledWith(
      expect.any(Function),
      'image/png',
      undefined
    );
  });

  it('should reject when canvas.toBlob returns null', async () => {
    const mockCanvas = {
      toBlob: vi.fn((callback: BlobCallback) => {
        callback(null);
      })
    } as unknown as HTMLCanvasElement;

    await expect(
      firstValueFrom(service.canvasToBlob(mockCanvas))
    ).rejects.toThrow('Failed to convert canvas to blob');
  });

  // --- importFile ---
  it('should create an Observable that sets up a file input on subscribe', () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      onchange: null,
      oncancel: null,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    const obs = service.importFile(['.xml']);
    expect(obs).toBeDefined();

    const sub = obs.subscribe();
    expect(mockInput.type).toBe('file');
    expect(mockInput.accept).toBe('.xml');
    expect(mockInput.click).toHaveBeenCalled();
    expect(document.body.appendChild).toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('should emit file result when a file is selected and read successfully', async () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    let capturedReader: any;
    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = class MockFileReader {
      onload: any = null;
      onerror: any = null;
      readAsText = vi.fn().mockImplementation(function(this: any) {
        capturedReader = this;
        setTimeout(() => {
          this.onload({ target: { result: '<xml>content</xml>' } });
        }, 0);
      });
    } as any;

    const promise = firstValueFrom(service.importFile(['.xml']));

    const mockFile = new File(['<xml>content</xml>'], 'test.xml', { type: 'text/xml' });
    mockInput.onchange({ target: { files: [mockFile] } });

    const result = await promise;
    expect(result.filename).toBe('test.xml');
    expect(result.content).toBe('<xml>content</xml>');
    expect(result.size).toBe(mockFile.size);
    globalThis.FileReader = OriginalFileReader;
  });

  it('should emit error when file read fails', async () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = class MockFileReader {
      onload: any = null;
      onerror: any = null;
      readAsText = vi.fn().mockImplementation(function(this: any) {
        setTimeout(() => {
          this.onerror();
        }, 0);
      });
    } as any;

    const promise = firstValueFrom(service.importFile());

    const mockFile = new File(['data'], 'test.xml');
    mockInput.onchange({ target: { files: [mockFile] } });

    await expect(promise).rejects.toThrow('Failed to read file');
    globalThis.FileReader = OriginalFileReader;
  });

  it('should complete without emitting when no file is selected', () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    let emitted = false;
    let completed = false;
    service.importFile().subscribe({
      next: () => { emitted = true; },
      complete: () => { completed = true; }
    });

    mockInput.onchange({ target: { files: [] } });

    expect(emitted).toBe(false);
    expect(completed).toBe(true);
  });

  it('should complete when cancel event fires', () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    let completed = false;
    service.importFile().subscribe({
      complete: () => { completed = true; }
    });

    mockInput.oncancel();

    expect(completed).toBe(true);
  });

  // --- importMultipleFiles ---
  it('should create an Observable with multiple=true for importMultipleFiles', () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      multiple: false,
      onchange: null,
      oncancel: null,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    const obs = service.importMultipleFiles(['.xml', '.bpmn']);
    expect(obs).toBeDefined();

    const sub = obs.subscribe();
    expect(mockInput.type).toBe('file');
    expect(mockInput.multiple).toBe(true);
    expect(mockInput.accept).toBe('.xml,.bpmn');
    expect(mockInput.click).toHaveBeenCalled();
    sub.unsubscribe();
  });

  it('should emit multiple file results when files are selected and read', async () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      multiple: false,
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    let readCount = 0;
    const contents = ['content1', 'content2'];
    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = class MockFileReader {
      onload: any = null;
      onerror: any = null;
      readAsText = vi.fn().mockImplementation(function(this: any) {
        const idx = readCount++;
        setTimeout(() => {
          this.onload({ target: { result: contents[idx] } });
        }, 0);
      });
    } as any;

    const promise = firstValueFrom(service.importMultipleFiles());

    const file1 = new File(['content1'], 'a.xml');
    const file2 = new File(['content2'], 'b.xml');
    mockInput.onchange({ target: { files: [file1, file2] } });

    const results = await promise;
    expect(results).toHaveLength(2);
    globalThis.FileReader = OriginalFileReader;
  });

  it('should complete when no files selected in importMultipleFiles', () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      multiple: false,
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    let completed = false;
    service.importMultipleFiles().subscribe({
      complete: () => { completed = true; }
    });

    mockInput.onchange({ target: { files: [] } });

    expect(completed).toBe(true);
  });

  it('should emit error when a file read fails in importMultipleFiles', async () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      multiple: false,
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    const OriginalFileReader = globalThis.FileReader;
    globalThis.FileReader = class MockFileReader {
      onload: any = null;
      onerror: any = null;
      readAsText = vi.fn().mockImplementation(function(this: any) {
        setTimeout(() => {
          this.onerror();
        }, 0);
      });
    } as any;

    const promise = firstValueFrom(service.importMultipleFiles());

    const file1 = new File(['data'], 'fail.xml');
    mockInput.onchange({ target: { files: [file1] } });

    await expect(promise).rejects.toThrow('Failed to read file: fail.xml');
    globalThis.FileReader = OriginalFileReader;
  });

  it('should complete when cancel fires on importMultipleFiles', () => {
    const mockInput: any = {
      type: '',
      accept: '',
      style: { display: '' },
      multiple: false,
      onchange: null as any,
      oncancel: null as any,
      click: vi.fn()
    };
    (document.createElement as any).mockReturnValue(mockInput);

    let completed = false;
    service.importMultipleFiles().subscribe({
      complete: () => { completed = true; }
    });

    mockInput.oncancel();
    expect(completed).toBe(true);
  });
});
