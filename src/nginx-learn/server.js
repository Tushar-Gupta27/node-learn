const express = require("express");
const path = require("path");
const app = express();
const port = process.env.PORT || 3000;

const appName = process.env.APP_NAME;

app.use("/images", express.static(path.join(__dirname, "images")));
//^ this is needed because the index.html file has URL with /images in it so it will send requests at /images -> so the server needs to host the static files as well
// can be tried by going to this link -> http://localhost:3000/images/devsecops.png

app.use("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
  console.log(`Request served by ${appName} ${JSON.stringify(req.headers)}`);
});

app.listen(port, () => {
  console.log(`${appName} is listening on port ${port}`);
});

//IMP
// * can directly run 3 instances using compose -> where we can either specify the image or directly build one from the dockerFile in the directory
