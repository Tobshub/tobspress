import { TobspressRouter } from "@tobshub/tobspress";

const apiRouter = new TobspressRouter();

apiRouter.get("/health", (req, res) => {
  res.send({ message: "As you can see, I'm health asf" });
});

export default apiRouter;
