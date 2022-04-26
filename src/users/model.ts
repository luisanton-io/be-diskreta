import mongoose, { Document } from "mongoose"
import bcrypt from "bcrypt"

type UserDocument = User & Document & {
    checkPassword(password: string): Promise<boolean>
}

interface UserModel extends mongoose.Model<UserDocument> {
    findByCredentials(nick: string): Promise<UserDocument>
}

const UserSchema = new mongoose.Schema<UserDocument, UserModel>({
    nick: {
        type: String,
        required: true,
    },
    publicKey: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
})

UserSchema.statics.findByCredentials = async function (nick: string, password: string) {
    const user = await this.findOne({ nick })

    if (!user) {
        return Promise.reject(new Error("User not found"))
    }

    if (!(await user.checkPassword(password))) {
        return Promise.reject(new Error("Invalid credentials"))
    }

    return user
}

UserSchema.methods.toJSON = function () {
    const user = this.toObject()

    delete user.password
    delete user.__v

    return user
}

UserSchema.methods.checkPassword = function (password: string) {
    return bcrypt.compare(password, this.password)
}

const User = mongoose.model("users", UserSchema)

export default User