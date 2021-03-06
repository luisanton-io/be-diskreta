interface User {
    _id: string
    nick: string
    publicKey: string
    digest?: string,
    refreshTokens: string[]
}

interface JWTPayload {
    _id: string
}

namespace Express {
    interface Request {
        user?: string
    }
}

// Shared with Frontend:

interface LoginResponse {
    token: string
    user: User
}

interface User {
    _id: string
    username: string
    publicKey: string
}

interface Message {
    sender: User
    to: User[] // all recipients list
    for: User["_id"] // id of user whose public key was used to encrypt the message
    chatId: string // calc as sha256([sender, ...to].sort().join())
    content: {
        text: string;
        media?: string
    }
    timestamp: number
}

interface Chat {
    messages: Message[];
    members: User[]
}