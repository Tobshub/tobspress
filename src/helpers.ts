export function splitPath(path: string) {
  let split = path.split("/");
  return split.filter((path) => path !== "");
}

export function sanitizePath(path: string) {
  return splitPath(path).join("/");
}
