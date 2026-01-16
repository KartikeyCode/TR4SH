import { Server } from "colyseus";
import { createServer } from "http";
import express from "express";
import cors from "cors";
import { TronRoom } from "./rooms/TronRoom";

const app = express();
app.use(cors());
app.use(express.json());

const gameServer = new Server({
    server: createServer(app),
});

gameServer.define("tron", TronRoom).filterBy(["gameMode"]);

gameServer.listen(2567);
console.log("Colyseus server listening on port 2567");
