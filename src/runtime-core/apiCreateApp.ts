import { createVnode } from "./vnode"

export function createAppAPI(render) {
  return (rootComponent) => {
    const app = {
      mount(container) {
        const vnode = createVnode(rootComponent)

        render(vnode, container)
      }
    }
    return app
  }
}