import { TextFieldEntry, isTextFieldEntryEdited } from '@bpmn-io/properties-panel';
import { useService } from 'bpmn-js-properties-panel';

// Type definitions
interface DiagramElement {
  businessObject?: {
    custom?: string;
    [key: string]: any;
  };
  id?: string;
  type?: string;
}

interface PropertyEntry {
  id: string;
  element: DiagramElement;
  component: any;
  isEdited: any;
}

interface CustomProps {
  element: DiagramElement;
  id: string;
}

interface ModelingService {
  updateProperties(element: DiagramElement, properties: { [key: string]: any }): void;
}

interface TranslateService {
  (key: string): string;
}

interface DebounceService {
  (fn: Function): Function;
}

export default function(element: DiagramElement): PropertyEntry[] {

  return [
    {
      id: 'custom',
      element,
      component: Custom,
      isEdited: isTextFieldEntryEdited
    }
  ];
}

function Custom(props: CustomProps) {
  const { element, id } = props;

  const modeling = useService('modeling') as ModelingService;
  const translate = useService('translate') as TranslateService;
  const debounce = useService('debounceInput') as DebounceService;

  const getValue = (): string => {
    return element.businessObject?.custom || '';
  }

  const setValue = (value: string) => {
    return modeling.updateProperties(element, {
      custom: value
    });
  }

  const title = translate('Custom property');
  const description = translate('Custom property description');

  return new TextFieldEntry({
    id,
    element,
    getValue,
    setValue,
    debounce,
    title,
    description
  });
}
