export class Component {}

export type ComponentType<T extends Component> = new (...params: any[]) => T;
