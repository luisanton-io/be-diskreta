import { Socket } from "socket.io";

interface Queue {
    messages: Message[],
    status: MessageStatusUpdate[]
}

interface OnlineUserData {
    socket: Socket
}
interface Shared {
    onlineUsers: Record<User["_id"], OnlineUserData>,
    queues: Record<User["_id"], Queue>
}

export const emptyQueue: Queue = {
    messages: [],
    status: []
}

const shared: Shared = {
    onlineUsers: {},
    queues: {}
};

export default shared