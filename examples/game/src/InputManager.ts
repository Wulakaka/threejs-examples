import { globals } from "./globals";

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

    const sides = [
      { elem: document.querySelector("#left")!, key: "left" },
      { elem: document.querySelector("#right")!, key: "right" },
    ];

    const clearKeys = () => {
      for (const { key } of sides) {
        setKey(key, false);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      // this is needed because we call preventDefault();
      // we also gave the canvas a tabindex so it can become the focus
      globals.canvas?.focus();
      window.addEventListener("pointermove", handleMouseMove);
      window.addEventListener("pointerup", handleMouseUp);

      for (const { elem, key } of sides) {
        let pressed = false;
        const rect = elem.getBoundingClientRect();
        const x = e.clientX;
        const y = e.clientY;
        const inRect =
          x >= rect.left &&
          x <= rect.right &&
          y >= rect.top &&
          y <= rect.bottom;
        if (inRect) {
          pressed = true;
        }
        setKey(key, pressed);
      }
    };

    function handleMouseUp() {
      clearKeys();
      window.removeEventListener("pointermove", handleMouseMove);
      window.removeEventListener("pointerup", handleMouseUp);
    }

    const uiElem = document.querySelector("#ui")!;
    uiElem.addEventListener(
      "pointerdown",
      handleMouseMove as (e: Event) => void,
      { passive: false }
    );
    uiElem.addEventListener(
      "touchstart",
      (e) => {
        // prevent scrolling
        e.preventDefault();
      },
      { passive: false }
    );
  }

  update() {
    for (const keyState of Object.values(this.keys)) {
      if (keyState.justPressed) {
        keyState.justPressed = false;
      }
    }
  }
}
