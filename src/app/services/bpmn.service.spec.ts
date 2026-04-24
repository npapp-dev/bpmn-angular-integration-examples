import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('bpmn-js/lib/Modeler', () => {
  return {
    default: vi.fn().mockImplementation(function (this: any, config: any) {
      this._config = config;
      this.attachTo = vi.fn();
      this.importXML = vi.fn().mockResolvedValue({ warnings: [] });
      this.saveXML = vi.fn().mockResolvedValue({ xml: '<xml/>' });
      this.saveSVG = vi.fn().mockResolvedValue({ svg: '<svg/>' });
      this.destroy = vi.fn();
      this.get = vi.fn().mockImplementation((name: string) => {
        if (name === 'propertiesPanel') return { attachTo: vi.fn() };
        if (name === 'commandStack') return { undo: vi.fn(), redo: vi.fn(), execute: vi.fn() };
        return {};
      });
    })
  };
});
vi.mock('bpmn-js-properties-panel', () => ({
  BpmnPropertiesPanelModule: {},
  BpmnPropertiesProviderModule: {}
}));
vi.mock('@bpmn-io/properties-panel', () => ({}));
vi.mock('../custom-properties-provider/custom-property-provider', () => ({ default: {} }));
vi.mock('../utils/descriptors/custom.json', () => ({ default: {} }));

import { TestBed } from '@angular/core/testing';
import { BpmnService } from './bpmn.service';
import { firstValueFrom } from 'rxjs';

describe('BpmnService', () => {
  let service: BpmnService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BpmnService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should create a modeler with merged config and return it', () => {
    const config = { container: '#canvas' };
    const modeler = service.createModeler(config);
    expect(modeler).toBeDefined();
    expect((modeler as any)._config.container).toBe('#canvas');
    expect((modeler as any)._config.additionalModules).toBeDefined();
    expect((modeler as any)._config.moddleExtensions).toBeDefined();
  });

  it('should return null initially from getModeler', () => {
    expect(service.getModeler()).toBeNull();
  });

  it('should return the modeler after createModeler is called', () => {
    service.createModeler({});
    expect(service.getModeler()).not.toBeNull();
  });

  it('should return a command stack from the modeler', () => {
    service.createModeler({});
    const cs = service.getCommandStack();
    expect(cs).toBeDefined();
    expect(cs!.undo).toBeDefined();
    expect(cs!.redo).toBeDefined();
    expect(cs!.execute).toBeDefined();
  });

  it('should cache the command stack on subsequent calls', () => {
    service.createModeler({});
    const modeler = service.getModeler()!;
    service.getCommandStack();
    service.getCommandStack();
    const getCalls = (modeler.get as any).mock.calls.filter(
      (call: any[]) => call[0] === 'commandStack'
    );
    expect(getCalls).toHaveLength(1);
  });

  it('should throw when getCommandStack is called without a modeler', () => {
    expect(() => service.getCommandStack()).toThrow();
  });

  it('should call modeler.attachTo when attachModeler is called', () => {
    service.createModeler({});
    const container = document.createElement('div');
    service.attachModeler(container);
    expect(service.getModeler()!.attachTo).toHaveBeenCalledWith(container);
  });

  it('should attach properties panel when propertiesContainer is provided', () => {
    service.createModeler({});
    const modeler = service.getModeler()!;
    const mockPanel = { attachTo: vi.fn() };
    (modeler.get as any).mockImplementation((name: string) => {
      if (name === 'propertiesPanel') return mockPanel;
      if (name === 'commandStack') return { undo: vi.fn(), redo: vi.fn(), execute: vi.fn() };
      return {};
    });
    const container = document.createElement('div');
    const propsContainer = document.createElement('div');
    service.attachModeler(container, propsContainer);
    expect(modeler.attachTo).toHaveBeenCalledWith(container);
    expect(mockPanel.attachTo).toHaveBeenCalledWith(propsContainer);
  });

  it('should throw when attachModeler is called without a modeler', () => {
    const container = document.createElement('div');
    expect(() => service.attachModeler(container)).toThrow(
      'Modeler not initialized. Call createModeler first.'
    );
  });

  it('should return Observable that resolves with warnings on importXML', async () => {
    service.createModeler({});
    const result = await firstValueFrom(service.importXML('<xml/>'));
    expect(result).toEqual({ warnings: [] });
  });

  it('should throw when importXML is called without a modeler', () => {
    expect(() => service.importXML('<xml/>')).toThrow(
      'Modeler not initialized. Call createModeler first.'
    );
  });

  it('should return promise resolving to xml on exportXML', async () => {
    service.createModeler({});
    const result = await service.exportXML();
    expect(result).toEqual({ xml: '<xml/>' });
  });

  it('should throw when exportXML is called without a modeler', () => {
    expect(() => service.exportXML()).toThrow(
      'Modeler not initialized. Call createModeler first.'
    );
  });

  it('should return promise resolving to svg on exportSVG', async () => {
    service.createModeler({});
    const result = await service.exportSVG();
    expect(result).toEqual({ svg: '<svg/>' });
  });

  it('should throw when exportSVG is called without a modeler', () => {
    expect(() => service.exportSVG()).toThrow(
      'Modeler not initialized. Call createModeler first.'
    );
  });

  it('should return XML string containing bpmn2:definitions from getDefaultXML', () => {
    const xml = service.getDefaultXML();
    expect(xml).toContain('bpmn2:definitions');
    expect(xml).toContain('<?xml version');
    expect(xml).toContain('bpmn2:startEvent');
  });

  it('should call modeler.destroy and set modeler to null on destroy', () => {
    service.createModeler({});
    const modeler = service.getModeler()!;
    service.destroy();
    expect(modeler.destroy).toHaveBeenCalled();
    expect(service.getModeler()).toBeNull();
  });

  it('should do nothing when destroy is called without a modeler', () => {
    expect(() => service.destroy()).not.toThrow();
    expect(service.getModeler()).toBeNull();
  });

  it('should return false from isReady initially', () => {
    expect(service.isReady()).toBe(false);
  });

  it('should return true from isReady after createModeler', () => {
    service.createModeler({});
    expect(service.isReady()).toBe(true);
  });
});
