import "react-native-gesture-handler";

import { enableScreens } from "react-native-screens";
import { registerRootComponent } from "expo";

import App from "./App";
import { reportJsCrash } from "./src/lib/jsCrash";

enableScreens(true);

type GlobalErrorUtils = {
  getGlobalHandler: () => ((error: Error, isFatal?: boolean) => void) | undefined;
  setGlobalHandler: (handler: (error: Error, isFatal?: boolean) => void) => void;
};

const errorUtils = (globalThis as { ErrorUtils?: GlobalErrorUtils }).ErrorUtils;
if (errorUtils) {
  const previous = errorUtils.getGlobalHandler();
  errorUtils.setGlobalHandler((error, isFatal) => {
    reportJsCrash(error);
    previous?.(error, isFatal);
  });
}

registerRootComponent(App);
