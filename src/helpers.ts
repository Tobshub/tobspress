export function splitPath(path: string) {
  let split = path.split("/");
  return split.filter((path) => path !== "");
}

export function sanitizePath(path: string) {
  return splitPath(path).join("/");
}

export const optionalExecute = (
  condition: boolean | undefined,
  fn: () => Promise<any> | any
) => {
  if (condition) fn();
};

export const tobspressLog = (...args: any) => {
  console.log("[Tobspress]", ...args);
};
