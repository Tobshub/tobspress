import Tobspress from "@tobshub/tobspress";
import apiRouter from "./api/router";
import bodyLog from "./middleware/bodyLog";

const app = new Tobspress({ log: true });

app.attach([bodyLog]);

app.static("public");

app.use("/api", { router: apiRouter });

app.use("/echo", (req, res) => {
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

app.use("/", (_, res) => {
  res.sendFile("./public/index.html");
});

app.listen(4000);
