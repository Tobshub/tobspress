export function splitPath(path: string) {
  let split = path.split("/");
  return split.filter((path) => path !== "");
}

export function sanitizePath(path: string) {
  return splitPath(path).join("/");
}

/** Log with Tobspress tag and timestamp */
export function tobspressLog(...args: any) {
  console.log("[Tobspress]", new Date(), ...args);
}
