import { Component, EventEmitter, Input, Output } from '@angular/core';

export interface ToolbarAction {
  id: string;
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  tooltip?: string;
  variant?: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info';
}

@Component({
  selector: 'app-diagram-toolbar',
  templateUrl: './diagram-toolbar.component.html',
  styleUrls: ['./diagram-toolbar.component.css'],
  standalone: false
})
export class DiagramToolbarComponent {
  @Input() diagramName: string = 'Untitled Diagram';
  @Input() hasUnsavedChanges: boolean = false;
  @Input() isReadonly: boolean = false;
  @Input() customActions: ToolbarAction[] = [];
  @Input() canUndo: boolean = false;
  @Input() canRedo: boolean = false;
  @Input() propertiesOpen: boolean = true;

  @Output() actionClicked = new EventEmitter<string>();
  @Output() importRequested = new EventEmitter<void>();
  @Output() exportXmlRequested = new EventEmitter<void>();
  @Output() exportSvgRequested = new EventEmitter<void>();
  @Output() resetRequested = new EventEmitter<void>();
  @Output() backupRequested = new EventEmitter<void>();
  @Output() zoomToFitRequested = new EventEmitter<void>();
  @Output() zoomInRequested = new EventEmitter<void>();
  @Output() zoomOutRequested = new EventEmitter<void>();
  @Output() undoRequested = new EventEmitter<void>();
  @Output() redoRequested = new EventEmitter<void>();
  @Output() togglePropertiesRequested = new EventEmitter<void>();

  // Cached action arrays. Consumers (and tests) rely on stable references,
  // so caches are keyed on the state they derive from and rebuilt only when
  // that state actually changes.
  private _defaultActions: ToolbarAction[] | null = null;
  private _defaultActionsReadonly: boolean | null = null;
  private _viewActions: ToolbarAction[] | null = null;
  private _editActions: ToolbarAction[] | null = null;
  private _editActionsKey: string | null = null;

  get defaultActions(): ToolbarAction[] {
    if (!this._defaultActions || this._defaultActionsReadonly !== this.isReadonly) {
      this._defaultActions = this.computeDefaultActions();
      this._defaultActionsReadonly = this.isReadonly;
    }
    return this._defaultActions;
  }

  get viewActions(): ToolbarAction[] {
    if (!this._viewActions) {
      this._viewActions = this.computeViewActions();
    }
    return this._viewActions;
  }

  get editActions(): ToolbarAction[] {
    const key = `${this.isReadonly}|${this.canUndo}|${this.canRedo}`;
    if (!this._editActions || this._editActionsKey !== key) {
      this._editActions = this.computeEditActions();
      this._editActionsKey = key;
    }
    return this._editActions;
  }

  get displayName(): string {
    return this.computeDisplayName();
  }

  get statusClass(): string {
    return this.computeStatusClass();
  }

  get statusText(): string {
    return this.computeStatusText();
  }

  private computeDefaultActions(): ToolbarAction[] {
    const readonlyState = this.isReadonly;
    return [
      {
        id: 'import',
        label: 'Import',
        icon: 'import',
        action: () => this.importRequested.emit(),
        tooltip: 'Import BPMN diagram from file',
        disabled: readonlyState
      },
      {
        id: 'export-xml',
        label: 'Export XML',
        icon: 'export-xml',
        action: () => this.exportXmlRequested.emit(),
        tooltip: 'Export diagram as XML',
        variant: 'primary'
      },
      {
        id: 'export-svg',
        label: 'Export SVG',
        icon: 'export-svg',
        action: () => this.exportSvgRequested.emit(),
        tooltip: 'Export diagram as SVG image',
        variant: 'info'
      },
      {
        id: 'backup',
        label: 'Backup',
        icon: 'backup',
        action: () => this.backupRequested.emit(),
        tooltip: 'Create backup with properties',
        variant: 'warning'
      },
      {
        id: 'reset',
        label: 'Reset',
        icon: 'reset',
        action: () => this.resetRequested.emit(),
        tooltip: 'Reset diagram to default state',
        variant: 'danger',
        disabled: readonlyState
      }
    ];
  }

  private computeViewActions(): ToolbarAction[] {
    return [
      {
        id: 'zoom-to-fit',
        label: 'Fit',
        icon: 'zoom-to-fit',
        action: () => this.zoomToFitRequested.emit(),
        tooltip: 'Zoom to fit viewport',
        variant: 'secondary'
      },
      {
        id: 'zoom-in',
        label: 'Zoom in',
        icon: 'zoom-in',
        action: () => this.zoomInRequested.emit(),
        tooltip: 'Zoom in',
        variant: 'secondary'
      },
      {
        id: 'zoom-out',
        label: 'Zoom out',
        icon: 'zoom-out',
        action: () => this.zoomOutRequested.emit(),
        tooltip: 'Zoom out',
        variant: 'secondary'
      }
    ];
  }

  private computeEditActions(): ToolbarAction[] {
    const readonlyState = this.isReadonly;
    return [
      {
        id: 'undo',
        label: 'Undo',
        icon: 'undo',
        action: () => this.undoRequested.emit(),
        tooltip: 'Undo last action',
        variant: 'secondary',
        disabled: readonlyState || !this.canUndo
      },
      {
        id: 'redo',
        label: 'Redo',
        icon: 'redo',
        action: () => this.redoRequested.emit(),
        tooltip: 'Redo last undone action',
        variant: 'secondary',
        disabled: readonlyState || !this.canRedo
      }
    ];
  }

  onActionClick(action: ToolbarAction): void {
    if (action.disabled) {
      return;
    }
    action.action();
    this.actionClicked.emit(action.id);
  }

  onTogglePropertiesClick(): void {
    this.togglePropertiesRequested.emit();
  }

  getActionClass(action: ToolbarAction): string {
    const baseClass = 'toolbar-btn';
    const variantClass = action.variant ? `btn-${action.variant}` : 'btn-secondary';
    const disabledClass = action.disabled ? 'disabled' : '';

    return `${baseClass} ${variantClass} ${disabledClass}`.trim();
  }

  private computeDisplayName(): string {
    const maxLength = 25;
    if (this.diagramName.length <= maxLength) {
      return this.diagramName;
    }
    return this.diagramName.substring(0, maxLength - 3) + '...';
  }

  private computeStatusClass(): string {
    return this.hasUnsavedChanges ? 'unsaved' : 'saved';
  }

  private computeStatusText(): string {
    return this.hasUnsavedChanges ? 'Unsaved changes' : 'Saved';
  }

  getAllActions(): { [category: string]: ToolbarAction[] } {
    return {
      file: this.defaultActions,
      edit: this.editActions,
      view: this.viewActions,
      custom: this.customActions
    };
  }

  hasActionsInCategory(category: string): boolean {
    const actions = this.getAllActions()[category];
    return actions && actions.length > 0;
  }

  trackByActionId(index: number, action: ToolbarAction): string {
    return action.id;
  }
}
