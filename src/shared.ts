import { Document } from "mongoose";
import { Socket } from "socket.io";

interface OnlineUserData {
    socket: Socket
    user: User & Document
}
interface Shared {
    onlineUsers: Record<User["_id"], OnlineUserData>,
}

export const makeEmptyQueues: () => Queues = () => ({
    messages: [],
    status: []
})

const shared: Shared = {
    onlineUsers: {}
};

export default shared