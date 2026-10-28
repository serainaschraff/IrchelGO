import { Mesh, type Material, type Object3D } from "three";

export function disposeThreeObject(root: Object3D) {
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    object.geometry.dispose();
    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];
    materials.forEach((material: Material) => material.dispose());
  });
}
