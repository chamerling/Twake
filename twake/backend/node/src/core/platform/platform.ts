import { TwakeContainer, TwakeServiceProvider, TwakeComponent, ServiceName } from "./framework";
import * as ComponentUtils from "./framework/utils/component-utils";
import path from "path";

@ServiceName("platform")
export class TwakePlatform extends TwakeContainer {
  constructor(protected options: TwakePlatformConfiguration) {
    super();
  }

  api(): TwakeServiceProvider {
    return null;
  }

  async loadComponents(): Promise<Map<string, TwakeComponent>> {
    return await ComponentUtils.loadComponents(
      [this.options.servicesPath, path.resolve(__dirname, "./services/")],
      this.options.services,
      {
        getProvider: this.getProvider.bind(this),
      },
    );
  }
}

export class TwakePlatformConfiguration {
  /**
   * The services to load in the container
   */
  services: string[];

  /**
   * The path to load services from
   */
  servicesPath: string;
}
