---
name: adding-element-properties
description: Use when adding or changing a property, property group, validation rule, business rule, conditional field, or element-type schema in the enhanced properties panel of this BPMN editor, or when a custom property does not render, validate, or survive BPMN XML export/import.
---

# Adding element properties

Everything is schema-driven from `src/app/models/element-schemas.ts`. **Adding a property to an existing element type needs no change to `custom.json`, the bpmn-js provider, the panel, or the service** — rendering, validation and XML persistence are generic. Ignore `src/docs/developer-guide.md`; its `groups:` / `registerPropertySchema` format does not exist.

## 1. Define the property

Append to the type's `properties` array (or to `CommonProperties` in `bpmn-elements.model.ts` for reuse):

```ts
{
  id: 'costCenter', name: 'costCenter',            // keep id === name; it is the XML name and the input's DOM id
  type: PropertyType.SELECT,                       // 14 types, each rendered by property-input.component.html
  label: 'Cost center', description: 'Budget owner',
  group: 'business',                               // key of PropertyGroups (unknown keys sort last, order 999)
  order: 60,                                       // position inside the group
  defaultValue: 'ops',
  options: [{ value: 'rnd', label: 'R&D' }, { value: 'sales', label: 'Sales' }, { value: 'ops', label: 'Operations' }],
  validation: [{ type: 'required', message: 'Cost center is required' }],   // required|minLength|maxLength|min|max|pattern|email|url|custom
  conditional: { dependsOn: 'implementation', values: ['external'] }        // optional: show only when another property has one of these values
}
```

New element type: add an `ElementSchemas` entry (`elementType`, `displayName`, `icon`, `description`, `properties`, optional `businessRules`), then update the `8` count and `ALL_SCHEMA_TYPES` in `element-schemas.spec.ts`, and optionally the name map in `diagram-status.component.ts`.

## 2. How a value flows (so you know what to test)

1. **Select** → `CustomPropertiesService.initializeElementProperties`: value = existing in-memory → `custom:Property` from `extensionElements` (parsed by type: `'true'`→bool, number, comma list, JSON) → `businessObject[name]` → `defaultValue` → type default.
2. **Edit** → `PropertiesPanelComponent.onPropertyValueChange` → `setProperty` (re-validates) → `applyPropertyToBpmnElement`:
   - `id`, `name`, `documentation` → `modeling.updateProperties(element, {...})` on the business object.
   - **everything else** → `updateCustomProperty` → `<custom:property name value type>` inside `<custom:properties>` inside `bpmn:ExtensionElements`, then `modeling.updateProperties(element, { extensionElements })` (undoable, marks dirty).
3. **Export** produces (verified in the running app):

```xml
<bpmn2:serviceTask id="ServiceTask_1" name="Process Payment">
  <bpmn2:extensionElements>
    <custom:properties>
      <custom:property name="costCenter" value="sales" type="select" />
    </custom:properties>
  </bpmn2:extensionElements>
</bpmn2:serviceTask>
```

Values are always strings in XML: booleans `'true'/'false'`, multiSelect comma-joined, objects `JSON.stringify`. moddle escapes `&` as `&#38;`.

## 3. Validation and business rules

- Per-property `validation` runs twice: in `PropertyInputComponent` (inline message) and in `ValidationService.validateProperty` (panel "Validation" tab + status bar). Cross-property checks are hard-coded in `performCrossPropertyValidation`.
- `businessRules` on a schema use a string `condition` evaluated by `new Function` with the element's property values as **bare identifiers** (plus `elementId`, `elementType`, `allElements`, `process`):

```ts
{ id: 'topicRequired', name: 'Topic Required', description: '...',
  condition: 'implementation === "external" && !topic',   // TRUE means the rule is VIOLATED → passed=false
  action: 'validate', target: 'topic', message: 'Topic is required for external task implementation' }
```

`action: 'validate'` → error keyed by `target` (or `'general'`). `action: 'default'` with `target`/`value` sets the property when `applyBusinessRules` runs after an edit. Other actions only `console.log`. A condition that throws is swallowed and counts as passed. Identifier replacement is a `\bname\b` regex over the whole expression, so avoid property names that also appear inside string literals of the condition.

## 4. Checklist

```
- [ ] property/schema added in element-schemas.ts (id === name, valid group key)
- [ ] spec pins updated (element-schemas.spec count/list; new `it` for the property)
- [ ] npx vitest run  → all green
- [ ] round-trip covered (see "XML round-trip test" in skill testing-bpmn-editor) or checked live:
      node .claude/skills/verifying-in-browser/scripts/verify-app.js --serve --select ServiceTask_1 --set costCenter=sales --xml bpmn2:serviceTask
- [ ] screenshot read, no console errors (skill verifying-in-browser)
```

## Common mistakes

- Editing `custom.json` to add an attribute for an enhanced-panel property. That descriptor only matters for the **native** bpmn-js panel (`CustomStartEvent.custom`) and for the generic `custom:Properties/Property` types that already exist.
- Using a `group` not in `PropertyGroups` (`general, execution, classification, status, technical, business, integration, advanced`) and wondering why it sorts last.
- Expecting a property on `bpmn:Task`, `SubProcess`, `BoundaryEvent`, etc. — they have no schema; add one first.
- Forgetting that `conditional` only hides the input; the hidden value is still validated and exported.
