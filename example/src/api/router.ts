import { TobspressRouter } from "@tobshub/tobspress";

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
const deepestRouter = new TobspressRouter();
deepestRouter.use("exec", (_, res) => {
  res.send({message: "this is the deepest router"});
})
deeperRouter.use("deepest", {router: deepestRouter})
deepRouter.use("deeper", {router: deeperRouter});
apiRouter.use("deep", {router: deepRouter})

export default apiRouter;
