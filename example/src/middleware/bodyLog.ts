import { TobspressRequest, TobspressResponse } from "@tobshub/tobspress";

export default async function bodyLog(
  req: TobspressRequest,
  res: TobspressResponse
) {
  if (req.method === "GET") return;
  console.log(req.url, await req.body, req.url);
}