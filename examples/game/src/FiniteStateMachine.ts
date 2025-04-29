export interface State {
  enter?: () => void;
  exit?: () => void;
  update?: () => void;
}

type States = {
  [key: string]: State;
};

export class FiniteStateMachine {
  states: States;
  currentState: string = "";
  constructor(states: States, initialState: string) {
    this.states = states;
    this.transition(initialState);
  }

  get state() {
    return this.currentState;
  }

  transition(state: string) {
    const oldState = this.states[this.currentState];
    if (oldState && oldState.exit) {
      oldState.exit.call(this);
    }
    this.currentState = state;
    const newState = this.states[state];
    if (newState.enter) {
      newState.enter.call(this);
    }
  }

  update() {
    const state = this.states[this.currentState];
    if (state.update) {
      state.update.call(this);
    }
  }
}
