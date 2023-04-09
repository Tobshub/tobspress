import Tobspress, { TobspressRouter } from "@tobshub/tobspress";

const app = new Tobspress();

app.use("/", (req, res) => {
  res.sendFile("index.html");
});

const echoRouter = new TobspressRouter();
echoRouter.use("/hello/world", (req, res) => {
  res.send("Come on! That's too easy.");
});

app.use("echo", (req, res) => {
  const url = req.url.split("/").filter((path) => path !== "");
  // remove echo from the text
  url.shift();
  if (url.length) {
    const message = url.join(" ").replace(/(%20)|\+/g, " ");
    if (message.toLowerCase() === "hello world") {
      res.send("Come on! That's too easy.");
      return;
    }
    res.send(message);
    return;
  }
  res.send({ message: "Append text to the url to make me say stuff!" });
});

app.listen(4000, () => {
  console.log("LIVE port(4000)");
});
