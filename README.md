# BPMN Angular Integration Examples

A comprehensive, production-ready BPMN 2.0 diagram editor built with **Angular 19** and **BPMN.js**. This project demonstrates advanced integration patterns, custom properties management, validation systems, and modern Angular development practices.

## 🎯 Overview

This Angular application provides a complete business process modeling solution featuring:

### ✨ Core Features
- 🎨 **Interactive BPMN Editor** - Full drag-and-drop diagram creation
- 🔧 **Advanced Properties Panel** - Comprehensive element configuration
- ✅ **Real-time Validation** - Built-in diagram and business rule validation
- 🔄 **Undo/Redo Support** - Complete command stack implementation
- 📁 **Import/Export** - BPMN XML and SVG export capabilities
- 🔌 **Extensible Architecture** - Custom properties and validation rules
- 📱 **Responsive Design** - Works seamlessly on desktop and mobile
- 🛡️ **Type Safety** - Full TypeScript implementation throughout

### 🚀 Advanced Capabilities
- **Custom Properties System** - Domain-specific element attributes
- **Business Rules Engine** - Automated property updates and validation
- **Modular Component Architecture** - Reusable and testable components
- **Service-Oriented Design** - Clean separation of concerns
- **Performance Optimized** - Efficient rendering and memory management

![BPMN Modeler Interface](https://user-images.githubusercontent.com/12006702/185782372-42f06a20-f6d6-471d-9c44-0811a9207649.png)

## 🔧 Technology Stack

| Component | Technology | Version |
|-----------|------------|---------|
| **Framework** | Angular | 19.1.6 |
| **BPMN Engine** | BPMN.js | 18.3.0 |
| **Properties Panel** | bpmn-js-properties-panel | 5.32.0 |
| **UI Framework** | Bootstrap | 5.2.0 |
| **Language** | TypeScript | 5.7.3 |
| **State Management** | RxJS | 7.5.0 |

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ 
- **npm** or **yarn**
- **Angular CLI** 19+

### Installation & Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd bpmn-angular-integration-examples
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Open your browser**
   Navigate to `http://localhost:4200`

### Basic Usage

```typescript
// Component setup with BPMN modeler
@Component({
  template: `
    <div class="bpmn-container">
      <div #diagramRef class="diagram-area"></div>
      <div #propertiesRef class="properties-panel"></div>
    </div>
  `
})
export class DiagramComponent implements AfterViewInit {
  @ViewChild('diagramRef', { static: true }) diagramRef!: ElementRef;
  @ViewChild('propertiesRef', { static: true }) propertiesRef!: ElementRef;

  constructor(private bpmnService: BpmnService) {}

  async ngAfterViewInit() {
    // Initialize BPMN modeler with custom properties
    this.bpmnService.createModeler({
      container: this.diagramRef.nativeElement,
      propertiesPanel: {
        parent: this.propertiesRef.nativeElement
      },
      additionalModules: [
        BpmnPropertiesPanelModule,
        BpmnPropertiesProviderModule,
        customPropertiesProvider
      ],
      moddleExtensions: {
        custom: customExtensions
      }
    });

    // Load default diagram
    const defaultXml = this.bpmnService.getDefaultXML();
    await this.bpmnService.importXML(defaultXml);
  }
}
```

## 📚 Documentation

Comprehensive documentation is available in the [`src/docs/`](src/docs/) directory:

- **[📖 Overview](src/docs/overview.md)** - Project introduction and key features
- **[🏗️ Architecture](src/docs/architecture.md)** - System design and component structure  
- **[👤 User Guide](src/docs/user-guide.md)** - How to use the BPMN editor
- **[⚡ Developer Guide](src/docs/developer-guide.md)** - Customization and extension
- **[📋 API Reference](src/docs/api-reference.md)** - Complete API documentation
- **[💡 Examples](src/docs/examples.md)** - Code samples and use cases
- **[🔧 Troubleshooting](src/docs/troubleshooting.md)** - Common issues and solutions

### Quick Links
- **New to BPMN?** → Start with [Overview](src/docs/overview.md)
- **Want to use the editor?** → Check [User Guide](src/docs/user-guide.md)  
- **Building custom features?** → See [Developer Guide](src/docs/developer-guide.md)
- **Need API details?** → Browse [API Reference](src/docs/api-reference.md)

## 🎯 Use Cases

This project is perfect for:

### 🏢 Business Process Management
- **Process Documentation** - Visual business process documentation
- **Workflow Design** - Design and model business workflows
- **Compliance Modeling** - Model regulatory compliance processes
- **Process Optimization** - Analyze and improve business processes

### 💻 Software Development
- **System Design** - Model system workflows and integrations  
- **API Orchestration** - Design service orchestration flows
- **Event Processing** - Model event-driven architectures
- **Microservices** - Design microservice interactions

### 🎓 Education & Training
- **BPMN Learning** - Hands-on BPMN 2.0 education
- **Angular Patterns** - Learn advanced Angular integration patterns
- **Best Practices** - Real-world implementation examples

## 🏗️ Project Architecture

The application follows a modular, service-oriented architecture:

```
src/app/
├── components/              # Reusable UI Components
│   ├── diagram-editor/      # Main BPMN editor component
│   ├── properties-panel/    # Advanced properties management
│   ├── diagram-toolbar/     # Editor toolbar and actions
│   └── diagram-status/      # Validation and status display
├── services/               # Business Logic Layer
│   ├── bpmn.service.ts         # Core BPMN.js integration
│   ├── custom-properties.service.ts # Property management
│   ├── validation.service.ts   # Validation engine
│   └── diagram-state.service.ts # Application state
├── models/                 # TypeScript Definitions
│   ├── bpmn-elements.model.ts  # BPMN element types
│   └── element-schemas.ts      # Property schemas
├── custom-properties-provider/ # BPMN.js Extensions
└── utils/                  # Helper utilities
```

## 🔌 Key Features Showcase

### Custom Properties System
Add domain-specific properties to any BPMN element:
```typescript
// Define custom properties for user tasks
const userTaskSchema = {
  assignee: { type: 'email', required: true },
  priority: { type: 'select', options: ['low', 'normal', 'high'] },
  dueDate: { type: 'date' }
};
```

### Real-time Validation
Implement business rules with custom validation:
```typescript
// Custom validation rule
const assigneeRule: ValidationRule = {
  id: 'assignee-required',
  elementTypes: [BpmnElementType.USER_TASK],
  validate: (context) => ({
    isValid: !!context.properties.assignee,
    errors: context.properties.assignee ? [] : ['Assignee is required']
  })
};
```

### Advanced Export Options
```typescript
// Export as BPMN XML
const { xml } = await bpmnService.exportXML();

// Export as SVG for documentation
const { svg } = await bpmnService.exportSVG();
```

## 🤝 Contributing

This project serves as both a working example and educational resource. Contributions are welcome:

1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'Add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[BPMN.js](https://bpmn.io/)** - Excellent BPMN 2.0 modeling toolkit
- **[Angular Team](https://angular.io/)** - Amazing web framework
- **[Bootstrap](https://getbootstrap.com/)** - Responsive UI components

---

**Ready to start building?** Check out the [User Guide](src/docs/user-guide.md) or dive into the [Developer Guide](src/docs/developer-guide.md) for advanced customization!
