import { TobspressRouter } from "@tobshub/tobspress";

const apiRouter = new TobspressRouter();

apiRouter
  .get("/health", async (_, res) => {
    res.send({ message: "As you can see, I'm health asf" });
  })
  .post("/form", async (req, res) => {
    res.send(`you sent: ${JSON.stringify((await req.body) ?? {})}`);
  });

const deeperRouter = new TobspressRouter();
const deepestRouter = new TobspressRouter();

deepestRouter.use("/run", (_, res) => res.send("ran from the deepest router"));

deeperRouter.use(
  "deep/deeper/deepest",
  {
    handler: (_, res) => {
      res.send({ alert: "This is the deepest router" });
    },
    router: deepestRouter,
  },
  { catchAll: false }
);

deeperRouter.use("/a/random/router", (_, res) => {
  res.send({ message: "This is a random router" });
});

apiRouter.use("/", {
  router: deeperRouter,
  handler: (_, res) => {
    res.send("hello world");
  },
});

export default apiRouter;
