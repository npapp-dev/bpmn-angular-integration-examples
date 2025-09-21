import {PropertyEntry} from "@angular/compiler-cli";

export interface DiagramElement {
  businessObject?: any;
  id?: string;
  type?: string;
}

export interface TranslateFunction {
  (key: string): string;
}

export interface PropertyGroup {
  id: string;
  label: string;
  entries: any[];
}

export type GroupsMiddleware = (groups: PropertyGroup[]) => PropertyGroup[];
