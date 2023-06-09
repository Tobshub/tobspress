import { TobspressRouter } from "../../../dist/index";

const apiRouter = new TobspressRouter();

apiRouter
  .get("/health", async (_, res) => {
    res.send({ message: "As you can see, I'm health asf" });
  })
  .post("/form", async (req, res) => {
    res.send(`you sent: ${JSON.stringify((await req.body) ?? {})}`);
  });

const deepRouter = new TobspressRouter();
const deeperRouter = new TobspressRouter();

deeperRouter.use(
  "/deepest",
  (_, res) => {
    res.send({ alert: "This is the deepest router" });
  },
  { catchAll: false }
);
deepRouter.use("/deeper", { router: deeperRouter });
apiRouter.use("/deep", { router: deepRouter });

export default apiRouter;
