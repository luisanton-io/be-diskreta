import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "./util/jwt";
import app from "./app";
import shared from "./shared";
import User from "./users/model";

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.use((socket, next) => {
    try {

        const token = socket.handshake.auth.token
        const { _id } = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string }

        if (!_id) throw new Error()

        next()
    } catch (error) {
        socket.emit("jwt-expired")
    }

})

io.on("connection", async socket => {
    console.log(socket.id)
    console.log(socket.handshake.auth)

    try {
        const { _id } = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET!) as JWTPayload

        const socketUser = await User.findById(_id)

        if (!socketUser) throw new Error("User not found")

        const onlineUser = shared.onlineUsers.find(u => u._id === _id)

        if (onlineUser) {
            onlineUser.sockets.push(socket)
        } else {
            shared.onlineUsers.push({ _id, sockets: [socket] })
        }

        console.table({ _id })

        socket.emit('dequeue', shared.messageQueue.filter(m => m.for === _id))
        shared.messageQueue = shared.messageQueue.filter(m => m.for !== _id)


        socket.on("out-msg", (msg: Message) => {
            console.log({ 'Received message': msg })

            msg.sender = socketUser.toJSON() // avoids a malicious user with a legit JWT token to impersonate another user.

            const user = shared.onlineUsers.find(u => u._id === msg.for)

            if (user) {
                for (const socket of user.sockets) {
                    socket.emit("in-msg", msg)
                }
            }
            else shared.messageQueue.push(msg)
        })

        socket.on('disconnect', () => {
            let socketIx = 0
            const onlineUserIx =
                shared.onlineUsers.findIndex(u => {
                    socketIx = u.sockets.findIndex(s => s.id === socket.id)
                    return socketIx !== -1
                })

            const onlineUser = shared.onlineUsers[onlineUserIx]

            if (onlineUser) {
                onlineUser.sockets.splice(socketIx, 1)
                !onlineUser.sockets.length && shared.onlineUsers.splice(onlineUserIx, 1)
            }

        })

        socket.onAny((event, payload) => {
            socket.emit("echo", { event, payload })
        })

    } catch (error) {
        console.log(error)
    }

});

export default httpServer