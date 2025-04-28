import * as THREE from "three";

function removeArrayElement<T>(array: T[], element: T) {
  const index = array.indexOf(element);
  if (index > -1) {
    array.splice(index, 1);
  }
}

export class GameObject {
  name: string;
  components: Component[];
  transform: THREE.Object3D;
  constructor(parent: THREE.Object3D, name: string) {
    this.name = name;
    this.components = [];
    this.transform = new THREE.Object3D();
    parent.add(this.transform);
  }
  addComponent<T extends Component>(
    ComponentType: new (gameObject: GameObject, ...args: any[]) => T,
    ...args: any[]
  ): T {
    const component = new ComponentType(this, ...args);
    this.components.push(component);
    return component;
  }

  removeComponent(component: Component) {
    removeArrayElement(this.components, component);
  }

  getComponent(ComponentType: new (gameObject: GameObject) => Component) {
    return this.components.find(
      (component) => component instanceof ComponentType
    );
  }

  update() {
    for (const component of this.components) {
      component.update();
    }
  }
}

// Base for all components
export class Component {
  gameObject: GameObject;
  constructor(gameObject: GameObject) {
    this.gameObject = gameObject;
  }
  update() {}
}
