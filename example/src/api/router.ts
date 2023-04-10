import { TobspressRouter } from "@tobshub/tobspress";

const apiRouter = new TobspressRouter();

apiRouter
  .get("/health", (req, res) => {
    res.send({ message: "As you can see, I'm health asf" });
  })
  .post("/form", async (req, res) => {
    res.send(`you sent: ${JSON.stringify((await req.body) ?? {})}`);
  });

export default apiRouter;
