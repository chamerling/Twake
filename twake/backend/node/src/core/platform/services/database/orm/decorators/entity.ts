import { registry } from "../registry";

export function Entity(options?: EntityOptions): ClassDecorator {
  return function (target: Function): void {
    console.log("Push new table");
    manager.getTables().push({
      name: options.name,
      target,
    });
  };
}

interface EntityOptions {
  /**
   * Table name
   */
  name?: string;
}
