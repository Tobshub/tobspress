# Tobspress - build nodejs HTTP REST APIs

![Tobspress Logo](https://tobsmg.onrender.com/img/p_h44y3qrqj5)

## Installation
```bash
yarn add @tobshub/tobspress
```
OR
```bash
npm i @tobshub/tobspress
```

## Usage
A simple example is available [here](./example/src/index.ts).

Create a new instance of `Tobspress`
```javascript
import Tobspress from "@tobshub/tobspress";

const app = new Tobspress();

app.listen(4000);
```

The `Tobspress` instance exposes method that will be familiar if you have used a similar library.

### Examples
```javascript
import Tobspress, {TobspressRouter} from "@tobshub/tobspress";

const app = new Tobspress();

const helloRouter = new TobspressRouter();

helloRouter.get("/world", (req, res) => {
  res.send("hello world");
});

app.use(
    "/hello", 
    (req, res) =>  res.send("hello"),
    helloRouter
);

app.use("/", (req, res) => {
  res.sendFile("public/index.html");
});

app.listen(4000);
```

<!-- TODO: API explanations -->
