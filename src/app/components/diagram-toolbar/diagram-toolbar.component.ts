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

  showMobileMenu: boolean = false;

  // Pre-computed properties that don't change frequently
  private _defaultActions: ToolbarAction[] | null = null;
  private _viewActions: ToolbarAction[] | null = null;
  private _editActions: ToolbarAction[] | null = null;

  constructor() {}

  // Cached property getters
  get defaultActions(): ToolbarAction[] {
    if (!this._defaultActions) {
      this._defaultActions = this.computeDefaultActions();
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
    if (!this._editActions) {
      this._editActions = this.computeEditActions();
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

  /**
   * Computes the default toolbar actions
   */
  private computeDefaultActions(): ToolbarAction[] {
    const readonlyState = this.isReadonly; // Cache readonly state
    return [
      {
        id: 'import',
        label: 'Import',
        icon: '📁',
        action: () => this.importRequested.emit(),
        tooltip: 'Import BPMN diagram from file',
        disabled: readonlyState
      },
      {
        id: 'export-xml',
        label: 'Export XML',
        icon: '💾',
        action: () => this.exportXmlRequested.emit(),
        tooltip: 'Export diagram as XML',
        variant: 'primary'
      },
      {
        id: 'export-svg',
        label: 'Export SVG',
        icon: '🖼️',
        action: () => this.exportSvgRequested.emit(),
        tooltip: 'Export diagram as SVG image',
        variant: 'info'
      },
      {
        id: 'backup',
        label: 'Backup',
        icon: '🔄',
        action: () => this.backupRequested.emit(),
        tooltip: 'Create backup with properties',
        variant: 'warning'
      },
      {
        id: 'reset',
        label: 'Reset',
        icon: '🔄',
        action: () => this.resetRequested.emit(),
        tooltip: 'Reset diagram to default state',
        variant: 'danger',
        disabled: readonlyState
      }
    ];
  }

  /**
   * Computes the zoom and view actions
   */
  private computeViewActions(): ToolbarAction[] {
    return [
      {
        id: 'zoom-to-fit',
        label: 'Fit',
        icon: '🔍',
        action: () => this.zoomToFitRequested.emit(),
        tooltip: 'Zoom to fit viewport',
        variant: 'secondary'
      },
      {
        id: 'zoom-in',
        label: '+',
        icon: '🔍',
        action: () => this.zoomInRequested.emit(),
        tooltip: 'Zoom in',
        variant: 'secondary'
      },
      {
        id: 'zoom-out',
        label: '−',
        icon: '🔍',
        action: () => this.zoomOutRequested.emit(),
        tooltip: 'Zoom out',
        variant: 'secondary'
      }
    ];
  }

  /**
   * Computes the edit actions (undo/redo)
   */
  private computeEditActions(): ToolbarAction[] {
    const readonlyState = this.isReadonly; // Cache readonly state
    return [
      {
        id: 'undo',
        label: 'Undo',
        icon: '↶',
        action: () => this.undoRequested.emit(),
        tooltip: 'Undo last action',
        variant: 'secondary',
        disabled: readonlyState
      },
      {
        id: 'redo',
        label: 'Redo',
        icon: '↷',
        action: () => this.redoRequested.emit(),
        tooltip: 'Redo last undone action',
        variant: 'secondary',
        disabled: readonlyState
      }
    ];
  }

  /**
   * Handles action click
   */
  onActionClick(action: ToolbarAction): void {
   /*  if (action.disabled) return; */
    console.log('Action clicked:', action.id);
    action.action();
    this.actionClicked.emit(action.id);
  }

  /**
   * Gets the CSS class for action button
   */
  getActionClass(action: ToolbarAction): string {
    const baseClass = 'toolbar-btn';
    const variantClass = action.variant ? `btn-${action.variant}` : 'btn-secondary';
    const disabledClass = action.disabled ? 'disabled' : '';
    
    return `${baseClass} ${variantClass} ${disabledClass}`.trim();
  }

  // Removed duplicated methods - they are now defined above

  /**
   * Computes the display name with truncation if needed
   */
  private computeDisplayName(): string {
    const maxLength = 25;
    if (this.diagramName.length <= maxLength) {
      return this.diagramName;
    }
    return this.diagramName.substring(0, maxLength - 3) + '...';
  }

  /**
   * Computes the status indicator class
   */
  private computeStatusClass(): string {
    return this.hasUnsavedChanges ? 'unsaved' : 'saved';
  }

  /**
   * Computes the status text
   */
  private computeStatusText(): string {
    return this.hasUnsavedChanges ? 'Unsaved changes' : 'Saved';
  }

  /**
   * Gets all actions grouped by category
   */
  getAllActions(): { [category: string]: ToolbarAction[] } {
    return {
      file: this.defaultActions,
      edit: this.editActions,
      view: this.viewActions,
      custom: this.customActions
    };
  }

  /**
   * Checks if any actions are available in a category
   */
  hasActionsInCategory(category: string): boolean {
    const actions = this.getAllActions()[category];
    return actions && actions.length > 0;
  }

  /**
   * TrackBy function for action buttons to prevent unnecessary re-rendering
   */
  trackByActionId(index: number, action: ToolbarAction): string {
    return action.id;
  }
}
