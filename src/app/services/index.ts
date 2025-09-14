// Service exports for easy importing
export { BpmnService } from './bpmn.service';
export { DiagramStateService } from './diagram-state.service';
export { CustomPropertiesService, EnhancedElementProperties, PropertyGroup } from './custom-properties.service';
export { ValidationService } from './validation.service';
export { FileService } from './file.service';

// Type exports
export type { BpmnConfig, ImportResult, ExportResult } from './bpmn.service';
export type { DiagramState, DiagramAction } from './diagram-state.service';
export type { CustomProperty, ElementProperties } from './custom-properties.service';
export type { FileExportOptions, FileImportResult } from './file.service';
