class EntitiesRegistry {
  readonly tables: Table[];

  getTables(): Table[] {
    return this.tables;
  }
}

export const registry = new EntitiesRegistry();

export type Table = {
  target: Function,
  name: string;
};
