import jwt from 'jsonwebtoken'
import { pki, util } from 'node-forge'
import { Document } from "mongoose"

class JWT {

    private _generate = (user: User, secret: string = process.env.JWT_SECRET!, expiresIn: string = '15min') => {
        const publicKey = pki.publicKeyFromPem(user.publicKey)
        const plainToken = jwt.sign({ _id: user._id }, secret, { expiresIn })
        return util.encode64(publicKey.encrypt(plainToken))
    }

    public generateFor = (user: User) => {
        return this._generate(user)
    }

    public generateRefreshFor = (user: User & Document) => {
        const refreshToken = this._generate(user, process.env.JWT_REFRESH_SECRET!, '99y')

        user.refreshTokens.push(refreshToken)
        user.save()

        return refreshToken
    }

    public generatePairFor = (user: User & Document) => {
        const [token, refreshToken] = [this.generateFor(user), this.generateRefreshFor(user)]

        return { token, refreshToken }
    }

    public verify = jwt.verify

}

export default new JWT()