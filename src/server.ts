import { createServer } from "http";
import { Server } from "socket.io";
import { ExtendedError } from "socket.io/dist/namespace";
import app from "./app";
import messageStatus from "./events/messageStatus";
import shared, { makeEmptyQueues } from "./shared";
import User from "./users/model";
import jwt from "./util/jwt";
import messageReaction from "./events/messageReaction";
import { DefaultEventsMap } from "socket.io/dist/typed-events";
import { Document } from "mongoose";


type ClientToServerEvents = DefaultEventsMap
type ServerToClientEvents = DefaultEventsMap
type InterServerEvents = DefaultEventsMap
interface SocketData {
    user: User & Document
}

const httpServer = createServer(app);
const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(httpServer, {
    maxHttpBufferSize: 1e8,
    pingTimeout: 60000
});

io.use(async (socket, next) => {
    try {
        const token = socket.handshake.auth.token || socket.handshake.headers.token

        const { _id } = jwt.verify(token, process.env.JWT_SECRET!) as { _id: string }

        if (!_id) throw new Error("Invalid token")

        let onlineUser = shared.onlineUsers[_id]

        if (!onlineUser) {
            const user = await User.findById(_id)
            if (!user) throw new Error("User not found")

            console.log("Connected user: " + user.nick)
            onlineUser = shared.onlineUsers[_id] = { user, socket }

        } else if (onlineUser.socket.id !== socket.id) {
            onlineUser.socket.disconnect()
            onlineUser.socket = socket
        }

        socket.data.user = onlineUser.user

        next()
    } catch (error) {
        console.log(error)
        next(error as ExtendedError)
        socket.connected && socket.disconnect()
    }
})
io.on("connection", async socket => {

    try {

        // Can't check here for duplicate socket, because while the new 
        // socket is reading from DB the User document, the old socket is
        // still connected and will receive the message.

        socket.on("out-msg", async (payload: OutgoingMessage, ack) => {
            // console.log({ 'Received message': payload })

            const recipientId = payload.for

            ack(recipientId)

            const outgoingMessage: OutgoingMessageWithSender = {
                ...payload,
                sender: socket.data.user!.toJSON() // avoids a malicious user with a legit JWT token to impersonate another user.
            }

            const forwardingMessage: ReceivedMessage = {
                ...outgoingMessage,
                status: 'new'
            }

            const onlineRecipient = shared.onlineUsers[recipientId]

            const deliverMessage = () =>
                !!onlineRecipient && new Promise<boolean>((resolve, reject) => {
                    onlineRecipient.socket.emit("in-msg", forwardingMessage, async (msgack: string) => {
                        const { hash, error } = JSON.parse(msgack) as MessageAck
                        if (error) {
                            console.log('in-msg ACK ERROR', error)
                            return reject(false)
                        }

                        await messageStatus(outgoingMessage, 'delivered')
                        // console.log("received ack for ", hash)
                        resolve(true)
                    })
                }).catch(console.error)

            if (!await deliverMessage()) {
                try {
                    const recipient = await User.findById(recipientId)
                    if (!recipient) return // should emit error

                    await recipient.updateOne({
                        $push: {
                            "queues.messages": forwardingMessage
                        }
                    })

                } catch (error) {
                    console.log(error)
                }
            }

        })

        socket.on("read-msg", async (message: ReceivedMessage) => {
            await messageStatus(message, 'read')
        })

        socket.on("out-reaction", messageReaction)

        socket.on("typing", ({ chatId, recipient, sender }) => {
            shared.onlineUsers[recipient._id.toString()]?.socket.emit("typing", { chatId, sender })
        })

        socket.on("disconnect", () => {
            const { nick, _id } = socket.data.user!
            console.log("Disconnecting " + nick)
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