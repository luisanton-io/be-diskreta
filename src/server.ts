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

        const onlineUser = shared.onlineUsers.find(u => u._id === _id)

        if (onlineUser) {
            onlineUser.sockets.push(socket)
        } else {
            shared.onlineUsers.push({ _id, sockets: [socket] })
        }

        console.table({ _id })

        socket.emit('dequeue', shared.messageQueue.filter(m => m.to.some(recipient => recipient._id === _id)))
        shared.messageQueue = shared.messageQueue.filter(m => m.to.some(recipient => recipient._id !== _id))


        socket.on("out-msg", (msg: Message) => {
            console.table({ 'Received message': msg.content.text })

            for (const recipient of msg.to) {
                const user = shared.onlineUsers.find(u => u._id === recipient._id)

                if (user) {
                    for (const socket of user.sockets) {
                        socket.emit("in-msg", msg)
                    }
                }
                else shared.messageQueue.push(msg)
            }
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

    } catch (error) {
        console.log(error)
    }

});

export default httpServer