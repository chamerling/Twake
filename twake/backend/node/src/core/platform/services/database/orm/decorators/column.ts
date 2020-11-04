export function Column(options?: ColumnOptions): PropertyDecorator {
  return function (object: Object, propertyName: string) {
    console.log("HEY", options, object, propertyName);
  };
}

interface ColumnOptions {
  primary: boolean;
  name: string;
  type: string; // todo define a type for type
}
