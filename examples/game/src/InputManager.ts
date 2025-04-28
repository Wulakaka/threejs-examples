export class InputManager {
  keys: {
    [key: string]: {
      down: boolean;
      justPressed: boolean;
    };
  };
  constructor() {
    this.keys = {};
    const keyMap = new Map<number, string>();

    const setKey = (keyName: string, pressed: boolean) => {
      const keyState = this.keys[keyName];
      keyState.justPressed = pressed && !keyState.down;
      keyState.down = pressed;
    };

    const addKey = (keyCode: number, name: string) => {
      this.keys[name] = {
        down: false,
        justPressed: false,
      };
      keyMap.set(keyCode, name);
    };

    const setKeyFromKeyCode = (keyCode: number, pressed: boolean) => {
      const keyName = keyMap.get(keyCode);
      if (!keyName) {
        return;
      }
      setKey(keyName, pressed);
    };

    addKey(37, "left");
    addKey(39, "right");
    addKey(38, "up");
    addKey(40, "down");
    addKey(90, "a");
    addKey(88, "b");

    window.addEventListener("keydown", (e) => {
      setKeyFromKeyCode(e.keyCode, true);
    });
    window.addEventListener("keyup", (e) => {
      setKeyFromKeyCode(e.keyCode, false);
    });
  }

  update() {
    for (const keyState of Object.values(this.keys)) {
      if (keyState.justPressed) {
        keyState.justPressed = false;
      }
    }
  }
}
