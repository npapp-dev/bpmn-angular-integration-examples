// Import your custom property entries.
// The entry is a text input field with logic attached to create,
// update and delete the "spell" property.
import customProperties from './properties/custom-properties';

import { is } from 'bpmn-js/lib/util/ModelUtil';

const LOW_PRIORITY = 500;

// Type definitions for better TypeScript support
interface PropertiesPanel {
  registerProvider(priority: number, provider: CustomPropertiesProvider): void;
}

interface DiagramElement {
  businessObject?: any;
  id?: string;
  type?: string;
}

interface TranslateFunction {
  (key: string): string;
}

interface PropertyGroup {
  id: string;
  label: string;
  entries: any[];
}

type GroupsMiddleware = (groups: PropertyGroup[]) => PropertyGroup[];

interface CustomPropertiesProvider {
  getGroups(element: DiagramElement): GroupsMiddleware;
}

/**
 * A provider with a `#getGroups(element)` method
 * that exposes groups for a diagram element.
 *
 * @param {PropertiesPanel} propertiesPanel
 * @param {TranslateFunction} translate
 */
function CustomPropertiesProvider(this: CustomPropertiesProvider, propertiesPanel: PropertiesPanel, translate: TranslateFunction): void {

  // API ////////

  /**
   * Return the groups provided for the given element.
   *
   * @param {DiagramElement} element
   *
   * @return {GroupsMiddleware} groups middleware
   */
  this.getGroups = function(element: DiagramElement): GroupsMiddleware {

    /**
     * We return a middleware that modifies
     * the existing groups.
     *
     * @param {PropertyGroup[]} groups
     *
     * @return {PropertyGroup[]} modified groups
     */
    return function(groups: PropertyGroup[]): PropertyGroup[] {

      // Add the "magic" group
      if(is(element, 'bpmn:StartEvent')) {
        groups.push(createCustomGroup(element, translate));
      }

      return groups;
    }
  };

  // registration ////////

  // Register our custom magic properties provider.
  // Use a lower priority to ensure it is loaded after
  // the basic BPMN properties.
  propertiesPanel.registerProvider(LOW_PRIORITY, this);
}

CustomPropertiesProvider.$inject = [ 'propertiesPanel', 'translate' ];

// Create the custom magic group
function createCustomGroup(element: DiagramElement, translate: TranslateFunction): PropertyGroup {

  // create a group called "Custom properties".
  const customGroup: PropertyGroup = {
    id: 'custom',
    label: translate('Custom properties'),
    entries: customProperties(element)
  };

  return customGroup;
}

export default {
  __init__: [ 'customPropertiesProvider' ],
  customPropertiesProvider: [ 'type', CustomPropertiesProvider ]
};
