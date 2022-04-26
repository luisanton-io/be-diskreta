import { Socket } from "socket.io";

interface Shared {
    onlineUsers: { _id: string, socket: Socket }[],
    messageQueue: Message[]
}

const shared: Shared = {
    onlineUsers: [],
    messageQueue: []
};

export default shared