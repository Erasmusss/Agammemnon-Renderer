import { ThreeSpace } from "./Three_Space.js";
import { WS_Space } from "./WS_Space.js";

window.addEventListener('DOMContentLoaded', () => {
  let _canvas = new ThreeSpace();
  let _wsApp = new WS_Space(_canvas);
  _canvas.addWS_Space(_wsApp);
});
