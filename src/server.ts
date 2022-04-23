import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import app from "./app";

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.on("connection", (socket) => {
    console.log(socket.id)
    console.log(socket.handshake.auth)
});

export default httpServer