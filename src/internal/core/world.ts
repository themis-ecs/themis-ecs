import { BlueprintRegistry } from './blueprint-registry';
import { EntityRegistry } from './entity-registry';
import { SystemRegistry } from './system-registry';
import { ComponentRegistry } from './component-registry';
import { EventRegistry } from './event-registry';
import { Entity } from './entity';
import { Component, ComponentType } from '../../public/component';
import { ComponentMapper } from './component-mapper';
import { World } from '../../public/world';
import { BlueprintDefinition } from '../../public/blueprint';
import { Event, EventType, EventListener, EntityCreateEvent, EventErrorCallback } from '../../public/event';
import { Container } from '../di/container';

/**
 * @internal
 */
export class ThemisWorld implements World {
  constructor(
    private readonly entityRegistry: EntityRegistry,
    private readonly systemRegistry: SystemRegistry,
    private readonly componentRegistry: ComponentRegistry,
    private readonly blueprintRegistry: BlueprintRegistry,
    private readonly eventRegistry: EventRegistry,
    private readonly container: Container
  ) {}

  public update(dt: number): void {
    this.entityRegistry.update();
    this.componentRegistry.update();
    this.systemRegistry.update(dt);
    this.eventRegistry.update();
  }

  public getEntityRegistry(): EntityRegistry {
    return this.entityRegistry;
  }

  public getComponentRegistry(): ComponentRegistry {
    return this.componentRegistry;
  }

  public getSystemRegistry(): SystemRegistry {
    return this.systemRegistry;
  }

  public getEventRegistry(): EventRegistry {
    return this.eventRegistry;
  }

  public createEntityId(): number {
    return this.entityRegistry.createEntityId();
  }

  public deleteEntityById(entity: number): void {
    this.entityRegistry.deleteEntityById(entity);
  }

  public getEntity(alias: string): Entity;
  public getEntity(entityId: number): Entity;
  public getEntity(entityIdOrAlias: number | string): Entity {
    return typeof entityIdOrAlias === 'number'
      ? this.entityRegistry.getEntity(entityIdOrAlias as number)
      : this.entityRegistry.getEntityByAlias(entityIdOrAlias as string);
  }

  public createEntity(): Entity;
  public createEntity(blueprint: string): Entity;
  public createEntity(blueprint?: string): Entity {
    const entity = this.getEntity(this.createEntityId());
    if (blueprint) {
      this.blueprintRegistry.applyBlueprint(entity, blueprint);
    }
    this.eventRegistry.submit(EntityCreateEvent, new EntityCreateEvent(entity.getEntityId()));
    return entity;
  }

  public getComponentMapper<T extends Component>(component: ComponentType<T>): ComponentMapper<T> {
    return this.componentRegistry.getComponentMapper(component);
  }

  public injectComponentMappers(object: any) {
    const proto = Object.getPrototypeOf(object);
    const componentMappers = proto.__componentMappers || {};
    Object.keys(componentMappers).forEach((key: any) => {
      const componentType = componentMappers[key];
      object[key] = this.getComponentMapper(componentType);
    });
  }
  public registerBlueprint(blueprint: BlueprintDefinition) {
    const blueprintConfiguration = this.componentRegistry.getBlueprintConfiguration(blueprint);
    blueprintConfiguration.initialize = blueprint.initialize ? blueprint.initialize : () => {};
    this.blueprintRegistry.registerBlueprint(blueprint.name, blueprintConfiguration);
  }

  public registerAlias(entityId: number, name: string) {
    this.entityRegistry.registerAlias(entityId, name);
  }

  public registerListener<T extends Event>(
    eventType: EventType<T>,
    listener: EventListener<T>,
    errorCallback?: EventErrorCallback<T>
  ) {
    this.eventRegistry.registerListener(eventType, listener, errorCallback);
  }

  public submit<T extends Event>(eventType: EventType<T>, event: T, instant = false) {
    this.eventRegistry.submit(eventType, event, instant);
  }

  public inject(object: any): void {
    this.container.inject(object);
  }
}