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
│   (Hidden)      │                       │               │
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
5. **Element Palette** - Available BPMN elements (appears on hover)

## 📐 Creating Your First Diagram

### Step 1: Start with a New Diagram

1. Click the **New** button in the toolbar
2. The canvas will clear and show an empty diagram
3. You'll see a start event in the middle of the canvas

### Step 2: Add Elements

1. **Access the Palette**
   - Hover over the left side of the canvas
   - The element palette will slide out
   - Click on any element to add it to the diagram

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

2. **Auto-Connection**
   - When adding new elements from the palette
   - Drop them near existing elements
   - The tool will automatically suggest connections

### Step 4: Configure Properties

1. **Select an Element**
   - Click on any element in the diagram
   - The properties panel updates on the right

2. **Edit Properties**
   - **General Tab**: Name, ID, documentation
   - **Custom Properties**: Domain-specific attributes
   - **Validation**: Real-time error checking

## 🔧 Working with Elements

### Element Types and Usage

#### Events
- **Start Event** - Beginning of a process
  - Use: Every process needs exactly one start event
  - Properties: Name, form fields, conditions

- **End Event** - Conclusion of a process
  - Use: Can have multiple end events
  - Properties: Name, result, terminate

- **Intermediate Events** - Occur during process execution
  - Use: Timer events, message events, error events
  - Properties: Event type, timer expressions, messages

#### Tasks
- **User Task** - Manual work performed by a person
  - Use: Forms, approvals, manual data entry
  - Properties: Assignee, form fields, due date

- **Service Task** - Automated system work
  - Use: API calls, data processing, integrations
  - Properties: Implementation, class, method

- **Script Task** - Automated script execution
  - Use: Data transformation, calculations
  - Properties: Script format, script content

#### Gateways
- **Exclusive Gateway** - Choose one path (XOR)
  - Use: Decision points with single outcome
  - Properties: Condition expressions

- **Parallel Gateway** - Execute all paths (AND)
  - Use: Split work into parallel streams
  - Properties: Join conditions

- **Inclusive Gateway** - Choose multiple paths (OR)
  - Use: Multiple possible outcomes
  - Properties: Condition expressions

### Element Operations

#### Moving Elements
- **Click and Drag** - Select element and drag to new position
- **Multi-Select** - Hold Ctrl/Cmd and click multiple elements
- **Move Together** - Drag any selected element to move all

#### Resizing Elements
- **Select Element** - Click to show resize handles
- **Drag Handles** - Pull corners or edges to resize
- **Maintain Aspect** - Hold Shift while dragging

#### Deleting Elements
- **Select and Delete** - Click element, press Delete key
- **Multiple Delete** - Select multiple elements, press Delete
- **Context Menu** - Right-click and choose Delete

#### Copying Elements
- **Copy/Paste** - Ctrl+C to copy, Ctrl+V to paste
- **Duplicate** - Ctrl+D to duplicate selected element
- **Cross-Diagram** - Copy between different diagrams

## 🎛️ Properties Panel

### General Properties

Every BPMN element has basic properties:

- **ID** - Unique identifier (auto-generated)
- **Name** - Display name for the element
- **Documentation** - Detailed description
- **Execution** - Runtime behavior settings

### Custom Properties

Enhanced properties for specific elements:

#### User Task Properties
- **Assignee** - Who performs the task
- **Candidate Groups** - Eligible user groups
- **Form Fields** - Input fields for the task
- **Due Date** - Task deadline
- **Priority** - Task importance level

#### Service Task Properties
- **Implementation** - How the task executes
- **Class** - Java class for execution
- **Method** - Specific method to call
- **Input/Output** - Data mapping

#### Gateway Properties
- **Condition Expression** - Decision logic
- **Default Flow** - Fallback path
- **Async Execution** - Performance settings

### Property Types

The properties panel supports various input types:

- **Text Fields** - Simple text input
- **Text Areas** - Multi-line text
- **Dropdowns** - Predefined options
- **Checkboxes** - Boolean values
- **Date Pickers** - Date selection
- **Number Inputs** - Numeric values
- **File Uploads** - Document attachments

### Validation

Properties are validated in real-time:

- **Required Fields** - Marked with red asterisk (*)
- **Format Validation** - Email, URL, date formats
- **Business Rules** - Domain-specific validations
- **Error Display** - Immediate feedback on invalid values

## 💾 File Operations

### Creating New Diagrams

1. **New Button** - Click toolbar "New" button
2. **Keyboard Shortcut** - Ctrl+N (Cmd+N on Mac)
3. **Confirmation** - Warns if current diagram has unsaved changes

### Opening Existing Diagrams

1. **Open Button** - Click toolbar "Open" button
2. **File Selection** - Choose .bpmn file from your computer
3. **Import Process** - Diagram loads with validation check
4. **Error Handling** - Invalid files show error messages

### Saving Diagrams

1. **Save Button** - Click toolbar "Save" button
2. **Keyboard Shortcut** - Ctrl+S (Cmd+S on Mac)
3. **File Format** - Saves as BPMN 2.0 XML format
4. **Filename** - Auto-generates or use custom name

### Exporting Diagrams

1. **Export XML** - BPMN 2.0 standard format
   - Use: Import into other BPMN tools
   - Process: Click "Export XML" → Download file

2. **Export SVG** - Vector graphics format
   - Use: Documentation, presentations
   - Process: Click "Export SVG" → Download file

## 🔍 Validation and Error Checking

### Real-Time Validation

The tool continuously validates your diagram:

- **Structural Validation** - BPMN model correctness
- **Business Rules** - Domain-specific requirements
- **Property Validation** - Required fields and formats
- **Process Flow** - Logical flow validation

### Validation Indicators

- **Green Checkmark** - Element is valid
- **Yellow Warning** - Potential issues
- **Red Error** - Must be fixed
- **Error Count** - Total issues displayed in status bar

### Common Validation Errors

1. **Missing Required Properties**
   - Error: "Name is required"
   - Fix: Add a name to the element

2. **Invalid Flow Connections**
   - Error: "Invalid sequence flow"
   - Fix: Ensure proper source/target elements

3. **Duplicate IDs**
   - Error: "Element ID must be unique"
   - Fix: Change element ID to unique value

4. **Missing Start/End Events**
   - Error: "Process must have start event"
   - Fix: Add start and end events to process

### Fixing Validation Issues

1. **Click Error Indicator** - Navigate to problematic element
2. **Properties Panel** - Shows specific error details
3. **Fix Properties** - Correct the invalid values
4. **Re-validate** - Errors clear automatically

## ⌨️ Keyboard Shortcuts

### General Navigation
- **Ctrl+N** - New diagram
- **Ctrl+O** - Open diagram
- **Ctrl+S** - Save diagram
- **Ctrl+Z** - Undo last action
- **Ctrl+Y** - Redo last action

### Element Operations
- **Delete** - Delete selected element(s)
- **Ctrl+C** - Copy selected element(s)
- **Ctrl+V** - Paste copied element(s)
- **Ctrl+D** - Duplicate selected element(s)
- **Ctrl+A** - Select all elements

### View Operations
- **Ctrl++** - Zoom in
- **Ctrl+-** - Zoom out
- **Ctrl+0** - Reset zoom to 100%
- **Ctrl+1** - Fit diagram to viewport
- **Arrow Keys** - Move selected element(s)

### Canvas Navigation
- **Space+Drag** - Pan the canvas
- **Mouse Wheel** - Zoom in/out
- **Middle Click+Drag** - Pan the canvas

## 🎨 Visual Customization

### Element Appearance

While the tool follows BPMN 2.0 standards, you can customize:

- **Colors** - Element background and border colors
- **Labels** - Text size and positioning
- **Layout** - Element spacing and alignment

### Canvas Settings

- **Grid** - Show/hide background grid
- **Snap to Grid** - Align elements to grid points
- **Rulers** - Display measurement rulers
- **Background** - Canvas background color

## 📱 Mobile and Touch Support

### Touch Gestures

- **Tap** - Select element
- **Double Tap** - Edit element properties
- **Pinch** - Zoom in/out
- **Two-Finger Drag** - Pan canvas
- **Long Press** - Context menu

### Mobile Interface

- **Responsive Layout** - Adapts to screen size
- **Collapsible Panels** - Properties panel can be hidden
- **Touch-Friendly** - Larger touch targets
- **Gesture Support** - Natural touch interactions

## 🆘 Troubleshooting

### Common Issues

1. **Diagram Won't Load**
   - Check file format (must be .bpmn)
   - Verify XML is valid BPMN 2.0
   - Clear browser cache

2. **Properties Panel Empty**
   - Ensure element is selected
   - Check if element type is supported
   - Refresh the page

3. **Can't Create Connections**
   - Verify source/target element types
   - Check if connection is valid in BPMN
   - Try connecting different elements

4. **Performance Issues**
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
