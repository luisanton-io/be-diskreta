import jwt from 'jsonwebtoken'
import { pki, util } from 'node-forge'
import { Document } from "mongoose"

class JWT {

    private _generate = (user: User, secret: string = process.env.JWT_SECRET!, expiresIn: string = '15min') => {
        return jwt.sign({ _id: user._id }, secret, { expiresIn })
    }

    public generateFor = (user: User) => {
        const publicKey = pki.publicKeyFromPem(user.publicKey)
        return util.encode64(publicKey.encrypt(this._generate(user)))
    }

    public generateRefreshFor = async (user: User & Document) => {
        const refreshToken = this._generate(user, process.env.JWT_REFRESH_SECRET!, '99y')

        user.refreshTokens.push(refreshToken)
        await user.save()

        return refreshToken
    }

    public generatePairFor = async (user: User & Document) => {
        const [token, refreshToken] = [this.generateFor(user), await this.generateRefreshFor(user)]

        return { token, refreshToken }
    }

    public verify = jwt.verify

}

export default new JWT()