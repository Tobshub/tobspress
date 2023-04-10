console.log("hi there <3");

const button = document.getElementById("js-button");

button.onclick = async () => {
  await fetch("/echo/hi/there/it's/me/.../deez/nuts")
    .then((res) => res.json())
    .then((data) => {
      console.log(data);
    });
};
