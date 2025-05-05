const axios = require("axios");
axios
  .get("http://localhost:5000/fourhundred")
  .then((d) => console.log(d))
  .catch((err) => console.log("catch", err.response.data));
