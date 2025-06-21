const express = require("express");
const cors = require("cors");
const http = require("http");
const socketIo = require("socket.io");
require("dotenv").config();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.json());

io.on("connection", (socket) => {
  console.log("Client connected");
  socket.on("disconnect", () => console.log("Client disconnected"));
});
app.set("io", io);

app.use("/disasters", require("./routes/disasters"));
app.use("/resources", require("./routes/resources"));
// app.use("/reports", require("./routes/reports"));
app.use("/geocode", require("./routes/geocode"));
// app.use("/verify", require("./routes/verify"));
// app.use("/updates", require("./routes/updates"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
