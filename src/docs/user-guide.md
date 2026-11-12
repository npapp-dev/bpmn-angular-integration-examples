# User Guide

## 🎯 Getting Started

Welcome to the BPMN Angular Integration tool! This guide will help you learn how to create, edit, and manage BPMN diagrams using our powerful web-based editor.

## 🚀 Quick Start

### Launching the Application

1. **Start the Development Server**
   ```bash
   npm start
   ```

2. **Open Your Browser**
   Navigate to `http://localhost:4200`

3. **Begin Creating**
   The application loads with a sample diagram. You can start editing immediately or create a new diagram.

## 🎨 Interface Overview

### Main Layout

```
┌─────────────────────────────────────────────────────────┐
│                     Toolbar                             │
├─────────────────┬───────────────────────┬───────────────┤
│                 │                       │               │
│   Element       │      Canvas           │  Properties   │
│   Palette       │      Area             │     Panel     │
│                 │                       │ (collapsible) │
│                 │                       │               │
├─────────────────┴───────────────────────┴───────────────┤
│                  Status Bar                             │
└─────────────────────────────────────────────────────────┘
```

### Key Components

1. **Toolbar** - File operations, edit commands, and view controls
2. **Canvas Area** - Main diagram editing workspace
3. **Properties Panel** - Element configuration and properties
4. **Status Bar** - Validation results and diagram information
5. **Element Palette** - bpmn-js palette on the left edge of the canvas, always visible

On phone widths (under 768px) the properties panel becomes a bottom sheet that you open with the floating button; on desktop you collapse it from the toolbar.

## 📐 Creating Your First Diagram

### Step 1: Start from the Default or an Empty Diagram

1. The app loads a sample diagram ("Enhanced BPMN Demo Process").
2. **Reset** in the toolbar reloads that sample diagram and discards your changes.
3. To start from your own file, use **Import**. There is no "New / empty diagram" button; to start blank, delete the sample elements on the canvas.

### Step 2: Add Elements

1. **Access the Palette**
   - The element palette is on the left side of the canvas
   - Click an entry, then click the canvas to place it (or drag it onto the canvas)
   - You can also click an element and use the context pad (the icons that appear next to it) to append a task, gateway or event

2. **Available Elements**
   - **Events**: Start, End, Intermediate
   - **Tasks**: User Task, Service Task, Script Task
   - **Gateways**: Exclusive, Parallel, Inclusive
   - **Flow**: Sequence Flow, Message Flow
   - **Data**: Data Object, Data Store

### Step 3: Connect Elements

1. **Create Sequence Flows**
   - Click on an element to select it
   - Look for the connection handles (small circles)
   - Drag from a handle to another element
   - Release to create the connection

2. **Context Pad**
   - Select an element and use the arrow/connect icons beside it
   - Appending a new element from the context pad connects it with a sequence flow automatically

### Step 4: Configure Properties

1. **Select an Element**
   - Click on any element in the diagram
   - The properties panel updates on the right

2. **Edit Properties**
   - The enhanced panel has three tabs: **Properties**, **Validation** and **Preview**, plus a search box
   - Properties are organised in collapsible groups (General, Execution, Technical, ...)
   - The native bpmn-js panel above it shows the standard BPMN properties; for Start Events it also has a "Custom properties" group
   - Only these element types have enhanced properties: User Task, Service Task, Script Task, Exclusive Gateway, Parallel Gateway, Start Event, End Event and Sequence Flow. For other types the panel shows an empty state

## 🔧 Working with Elements

### Element Types and Usage

#### Events
- **Start Event** - Beginning of a process
  - Use: Marks where the process begins
  - Properties: Name, initiator, event type

- **End Event** - Conclusion of a process
  - Use: Can have multiple end events
  - Properties: Name, event type

- **Intermediate Events** - Occur during process execution
  - Use: Timer events, message events, error events
  - Properties: Available in the canvas and native panel, but have no enhanced property schema

#### Tasks
- **User Task** - Manual work performed by a person
  - Use: Forms, approvals, manual data entry
  - Properties: Assignee, candidate users/groups, form key, due date, priority

- **Service Task** - Automated system work
  - Use: API calls, data processing, integrations
  - Properties: Implementation (java class, expression, delegate expression, external topic), retry cycle, timeout

- **Script Task** - Automated script execution
  - Use: Data transformation, calculations
  - Properties: Script format, script content

#### Gateways
- **Exclusive Gateway** - Choose one path (XOR)
  - Use: Decision points with single outcome
  - Properties: Default flow, decision criteria

- **Parallel Gateway** - Execute all paths (AND)
  - Use: Split work into parallel streams
  - Properties: Name, documentation and common properties

- **Inclusive Gateway** - Choose multiple paths (OR)
  - Use: Multiple possible outcomes
  - Properties: Can be drawn, but has no enhanced property schema

### Element Operations

These come from bpmn-js and work with the mouse:

#### Moving Elements
- **Click and Drag** - Select element and drag to new position
- **Multi-Select** - Hold Shift and click multiple elements (or drag a selection box with the lasso tool in the palette)
- **Move Together** - Drag any selected element to move all

#### Resizing Elements
- **Select Element** - Click to show resize handles on resizable shapes (sub-processes, pools)

#### Deleting Elements
- **Select and Delete** - Click the element, then use the trash icon in the context pad

#### Undo and Redo
- Use the **Undo** / **Redo** buttons in the toolbar

## 🎛️ Properties Panel

### General Properties

Every BPMN element has basic properties:

- **ID** - Unique identifier (must start with a letter; letters, digits, `_` and `-` only)
- **Name** - Display name for the element
- **Documentation** - Detailed description
- **Execution / Classification / Status** - Common groups such as priority, category, tags and active flag, depending on the element type

### Custom Properties

Enhanced properties for specific elements:

#### User Task Properties
- **Assignee**, **Candidate Users**, **Candidate Groups** - Who performs the task (at least one is required)
- **Form Key** - Form identifier
- **Due Date** and **Priority**

#### Service Task Properties
- **Implementation** - java, expression, delegate expression or external
- **Java Class**, **Expression**, **Topic** - Required depending on the implementation chosen
- **Retry Time Cycle**, **Timeout**

#### Script Task Properties
- **Script Format** and **Script**

#### Gateway and Flow Properties
- **Exclusive Gateway** - Default flow, decision criteria
- **Sequence Flow** - Condition expression, default-flow flag

### Property Types

The enhanced panel renders one input per property type:

- **Text, Email, URL** - Single-line inputs
- **Textarea** - Multi-line text
- **Select / Multi-select** - Predefined options
- **Boolean** - Checkbox
- **Number**
- **Date, Date-time, Time**
- **Color**
- **JSON** - Editable JSON text
- **File** - File picker

### Validation

Properties are validated in real-time:

- **Required Fields** - Marked with an asterisk (*)
- **Format Validation** - Pattern, length, min/max, email and URL rules
- **Business Rules** - For example a user task must have an assignee, candidate users, or candidate groups
- **Error Display** - Immediate feedback next to the field, in the Validation tab, and as a summary in the status bar

## 💾 File Operations

### Resetting the Diagram

1. **Reset Button** - Click **Reset** in the toolbar
2. The sample diagram is reloaded and your changes are discarded. There is no confirmation prompt, so export first if you want to keep your work.

### Importing Diagrams

1. **Import Button** - Click **Import** in the toolbar
2. **File Selection** - Choose an `.xml` or `.bpmn` file from your computer
3. **Validation** - The file must be well-formed XML, otherwise the status bar shows "Invalid XML file"
4. The diagram name in the toolbar is taken from the file name

### Saving Diagrams

There is no Save button or server storage. Use **Export XML** to download the diagram (file name = diagram name) and **Backup** to download a JSON file with the XML, the selected element's properties and the app state.

### Exporting Diagrams

1. **Export XML** - BPMN 2.0 standard format
   - Use: Import into other BPMN tools
   - Process: Click "Export XML" → Download file; the unsaved-changes indicator is cleared

2. **Export SVG** - Vector graphics format
   - Use: Documentation, presentations
   - Process: Click "Export SVG" → Download file

## 🔍 Validation and Error Checking

### Real-Time Validation

The tool validates the properties of the selected element as you edit them:

- **Property Validation** - Required fields and formats from the element's schema
- **Business Rules** - Domain-specific requirements on the element's properties

It does **not** check BPMN structure (for example missing start/end events or unconnected flows).

### Validation Indicators

- **Check icon** - Element is valid
- **Warning icon** - The element has errors or warnings
- **Error count** - Shown on the Validation tab and summarised in the status bar; the status bar details popover can be dismissed

### Common Validation Errors

1. **Missing Required Properties**
   - Example: "Element ID is required", "Assignee is required"
   - Fix: Fill in the field

2. **Invalid ID**
   - Error: "ID must start with a letter and contain only letters, numbers, underscores, and hyphens"
   - Fix: Change the element ID

3. **Business rule violations**
   - Example: "User task must have an assignee, candidate users, or candidate groups defined"
   - Example: "Java class is required when implementation type is "Java Class""
   - Fix: Fill in the property named in the message

### Fixing Validation Issues

1. **Select the element** - The panel shows its validation state
2. **Open the Validation tab** - Lists the specific errors and warnings
3. **Fix Properties** - Correct the invalid values
4. **Re-validate** - Errors clear automatically as you edit

## ⌨️ Keyboard Shortcuts and Navigation

The modeler is created without a `keyboard.bindTo` option, so the bpmn-js keyboard shortcuts (Ctrl+Z, Ctrl+C/V, Delete, ...) are **not** enabled. Use the toolbar buttons for undo, redo and zoom.

### Canvas Navigation
- **Drag on empty canvas** - Pan (hand tool)
- **Ctrl/Cmd + Mouse Wheel** - Zoom in/out (the wheel alone scrolls)
- **Zoom in / Zoom out / Fit** - Toolbar buttons; the zoom level is shown in the status bar

## 📱 Mobile and Touch Support

### Mobile Interface

- **Responsive Layout** - Adapts to screen size; the diagram is zoomed to fit on small screens at load
- **Properties Bottom Sheet** - Under 768px the properties panel is a bottom sheet opened with the floating button
- **Dark Mode** - Follows the system `prefers-color-scheme`

## 🆘 Troubleshooting

### Common Issues

1. **Diagram Won't Load**
   - Check file format (.xml or .bpmn)
   - Verify XML is valid BPMN 2.0
   - Clear browser cache

2. **Properties Panel Empty**
   - Ensure an element is selected
   - Check that the element type has enhanced properties (see the list above); other types show an empty state
   - Refresh the page

3. **Can't Create Connections**
   - Verify source/target element types
   - Check if connection is valid in BPMN
   - Try connecting different elements

4. **Properties button hidden on a phone**
   - The validation popover in the status bar can cover the floating properties button; dismiss it first

5. **Performance Issues**
   - Large diagrams may be slow
   - Try breaking into smaller processes
   - Use modern browser with good performance

### Getting Help

- **Validation Messages** - Check status bar for specific errors
- **Browser Console** - Look for JavaScript errors
- **Documentation** - Refer to other sections in this guide
- **Community** - Check project issues on GitHub

## 🎓 Best Practices

### Diagram Design

1. **Keep It Simple** - Avoid overly complex diagrams
2. **Use Standard Names** - Clear, descriptive element names
3. **Logical Flow** - Ensure process flow makes sense
4. **Consistent Style** - Use similar naming conventions

### Process Modeling

1. **Start/End Events** - Every process needs clear boundaries
2. **Gateway Usage** - Use appropriate gateway types
3. **Error Handling** - Include error paths where needed
4. **Documentation** - Add descriptions to complex elements

### Performance

1. **Element Count** - Keep diagrams under 100 elements
2. **Complex Properties** - Minimize very complex property sets
3. **Validation** - Fix validation errors promptly
4. **File Size** - Keep exported files reasonably sized

---

This user guide provides everything you need to effectively use the BPMN diagram editor. For more advanced topics, see the [Developer Guide](developer-guide.md) and [API Reference](api-reference.md).
