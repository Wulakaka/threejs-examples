export class SafeArray<T = unknown> {
  array: T[];
  addQueue: T[];
  removeQueue: Set<T>;
  constructor() {
    this.array = [];
    this.addQueue = [];
    this.removeQueue = new Set();
  }
  get isEmpty() {
    return this.addQueue.length + this.array.length > 0;
  }
  add(element: T) {
    this.addQueue.push(element);
  }
  remove(element: T) {
    this.removeQueue.add(element);
  }
  forEach(fn: (element: T) => void) {
    this._addQueued();
    this._removeQueued();
    for (const element of this.array) {
      if (this.removeQueue.has(element)) {
        continue;
      }
      fn(element);
    }
    this._removeQueued();
  }
  _addQueued() {
    if (this.addQueue.length) {
      this.array.splice(this.array.length, 0, ...this.addQueue);
      this.addQueue = [];
    }
  }
  _removeQueued() {
    if (this.removeQueue.size) {
      this.array = this.array.filter(
        (element) => !this.removeQueue.has(element)
      );
      this.removeQueue.clear();
    }
  }
}
