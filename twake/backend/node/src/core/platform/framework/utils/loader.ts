import { logger } from "../logger";

export class Loader {
  constructor(readonly paths: string[]) {}

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async load(componentName: string): Promise<any> {
    const modulesPaths = this.paths.map(path => `${path}/${componentName}`);

    logger.debug(`Loading ${componentName} from ${modulesPaths.join(" - ")}`);

    let classes = await Promise.all(modulesPaths.map(async modulePath => {
      try {
        return await import(modulePath);
      } catch (err) {
        logger.debug(`${modulePath} not found`);
      }
    }));

    classes = classes.filter(Boolean);

    if (!classes || !classes.length) {
      throw new Error(`Can not find ${componentName} in any given path`);
    }

    return classes[0].default;
  }
}
