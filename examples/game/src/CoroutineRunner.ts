import { globals } from "./globals";

// 定义协程栈类型
type G = Generator<G | void>;
type CoroutineStack = G[];

export function* waitSeconds(duration: number): G {
  while (duration > 0) {
    duration -= globals.deltaTime;
    yield;
  }
}

export class CoroutineRunner {
  generatorStacks: CoroutineStack[];
  addQueue: CoroutineStack[];
  removeQueue: Set<G>;

  constructor() {
    this.generatorStacks = [];
    this.addQueue = [];
    this.removeQueue = new Set<G>();
  }

  isBusy(): boolean {
    return this.addQueue.length + this.generatorStacks.length > 0;
  }

  add(generator: G, delay = 0): void {
    const genStack: CoroutineStack = [generator];
    if (delay) {
      genStack.push(waitSeconds(delay));
    }
    this.addQueue.push(genStack);
  }

  remove(generator: G): void {
    this.removeQueue.add(generator);
  }
  update() {
    this._addQueued();
    this._removeQueued();
    for (const genStack of this.generatorStacks) {
      const main = genStack[0];
      // Handle if one coroutine removes another
      if (this.removeQueue.has(main)) {
        continue;
      }
      while (genStack.length) {
        const topGen = genStack[genStack.length - 1];
        const { value, done } = topGen.next();
        if (done) {
          if (genStack.length === 1) {
            this.removeQueue.add(topGen);
            break;
          }
          genStack.pop();
        } else if (value) {
          genStack.push(value);
        } else {
          break;
        }
      }
    }
    this._removeQueued();
  }

  _addQueued() {
    if (this.addQueue.length) {
      this.generatorStacks.splice(
        this.generatorStacks.length,
        0,
        ...this.addQueue
      );
      this.addQueue = [];
    }
  }

  _removeQueued() {
    if (this.removeQueue.size) {
      this.generatorStacks = this.generatorStacks.filter(
        (genStack) => !this.removeQueue.has(genStack[0])
      );
      this.removeQueue.clear();
    }
  }
}
