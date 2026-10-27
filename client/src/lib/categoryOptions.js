// Turns the admin category tree into a flat list for <select> menus:
// [{ _id, label: "Fruits & Vegetables › Fruits › Local Fruits", depth }]
export function flattenCategories(nodes, path = []) {
  return nodes.flatMap((node) => {
    const names = [...path, node.name]
    return [
      { _id: node._id, label: names.join(' › '), name: node.name, depth: names.length - 1, isVisible: node.isVisible },
      ...flattenCategories(node.children || [], names),
    ]
  })
}
