import { createVnode } from "./vnode"

export function createAppAPI(render) {
  return (rootComponent) => {
    const app = {
      mount(container) {
        const vnode = createVnode(rootComponent)
        console.log('444:', rootComponent)

        render(vnode, container)
      }
    }
    return app
  }
}