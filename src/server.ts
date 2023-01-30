import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import jwt from "./util/jwt";
import app from "./app";
import shared, { emptyQueue } from "./shared";
import User from "./users/model";
import messageStatus from "./events/messageStatus";

const httpServer = createServer(app);
const io = new Server(httpServer, { /* options */ });

io.use((socket, next) => {
    try {

        const token = socket.handshake.auth.token || socket.handshake.headers.token
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

        if (!socketUser) throw new Error("User not found");

        shared.onlineUsers[_id] = { socket }

        console.table({ _id })

        shared.queues[_id] && socket.emit('dequeue', shared.queues[_id], () => {
            const { messages } = shared.queues[_id]
            messages.forEach(msg => messageStatus(msg, 'delivered'))
            delete shared.queues[_id]
        })

        socket.on("out-msg", async (payload: OutgoingMessage, ack) => {
            console.log({ 'Received message': payload })

            const recipientId = payload.for

            const outgoingMessage: OutgoingMessageWithSender = {
                ...payload,
                sender: socketUser.toJSON() // avoids a malicious user with a legit JWT token to impersonate another user.
            }

            const forwardingMessage: ReceivedMessage = {
                ...outgoingMessage,
                status: 'new'
            }

            const onlineRecipient = shared.onlineUsers[recipientId]

            const deliverMessage = () =>
                !!onlineRecipient && new Promise<boolean>((resolve, reject) => {
                    onlineRecipient.socket.emit("in-msg", forwardingMessage, (error: string) => {
                        if (error) {
                            console.log('in-msg ACK ERROR', error)
                            return reject(false)
                        }

                        messageStatus(outgoingMessage, 'delivered')
                        resolve(true)
                    })
                })


            if (!await deliverMessage()) {
                (shared.queues[recipientId] ||= emptyQueue).messages.push(forwardingMessage)
            }

            ack(recipientId)

        })

        socket.on("read-msg", (message: ReceivedMessage) => {
            messageStatus(message, 'read')
        })

        socket.on('disconnect', () => {
            console.log("disconnecting " + socketUser.nick)
            delete shared.onlineUsers[_id]
        })

        socket.onAny((event, payload) => {
            socket.emit("echo", { event, payload })
        })

    } catch (error) {
        console.log(error)
    }

});

export default httpServer