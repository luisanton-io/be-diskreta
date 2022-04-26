import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken"
import app from "./app";
import shared from "./shared";

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.on("connection", socket => {
    console.log(socket.id)
    console.log(socket.handshake.auth)

    try {
        const { _id } = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET!) as JWTPayload

        shared.onlineUsers.push({ _id, socket })

        socket.emit('dequeue', shared.messageQueue.filter(m => m.to.includes(_id)))
        shared.messageQueue = shared.messageQueue.filter(m => !m.to.includes(_id))


        socket.on("out-msg", (msg: Message) => {
            for (const userId of msg.to) {
                const user = shared.onlineUsers.find(u => u._id === userId)

                if (user) user.socket.emit("in-msg", msg)
                else shared.messageQueue.push(msg)
            }
        })

        socket.on('disconnect', () => {
            shared.onlineUsers = shared.onlineUsers.filter(user => user.socket.id !== socket.id)
        })

    } catch (error) {
        console.log(error)
    }

});

export default httpServer