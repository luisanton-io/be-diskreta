import bcrypt from "bcrypt"
import express, { RequestHandler } from "express"
import createHttpError from "http-errors"
import { pki, util } from "node-forge"
import { jwtGuard } from "../middlewares/jwtGuard"
import shared from "../shared"
import jwt from "../util/jwt"
import User from "./model"

const usersRouter = express.Router()

usersRouter
    .get("/online", jwtGuard, async (req, res, next) => {
        const users = await User.find({ _id: shared.onlineUsers.map(u => u._id) })

        console.log(shared.onlineUsers.map(u => u.sockets))
        res.status(200).send(users)
    })
    .get("/queue", async (req, res, next) => {
        console.log(shared.messageQueue)
        res.status(204).send()
    })
    .get("/", jwtGuard, async (req, res, next) => {
        try {
            const { nick: nickQuery, exact } = req.query

            const nick = exact ? nickQuery : new RegExp("^" + nickQuery, "i")

            const users = await User.find(nickQuery ? { $and: [{ nick }, { $not: { _id: req.user } }] } : {})

            if (!users.length && exact) {
                return next(createHttpError(404, "User not found"))
            }

            res.send(exact ? users[0] : users)
        } catch (error) {
            next(error)
        }
    })
    .post("/", async (req, res, next) => {
        try {
            const digest = await bcrypt.hash(req.body.digest, 12)
            const user = new User({
                ...req.body,
                digest
            })

            await user.save()

            const { token, refreshToken } = jwt.generatePairFor(user)

            res.status(201).send({ user, token, refreshToken })
        } catch (error) {
            next(error)
        }
    })
    .post("/refreshToken", async (req, res, next) => {
        try {
            const { refreshToken: currentRefreshToken } = req.body

            const user = await User.findOne({ refreshToken: currentRefreshToken })

            if (!user) {
                return next(createHttpError(401, "Invalid refresh token"))
            }

            await user.update({
                $pull: {
                    refreshToken: currentRefreshToken
                }
            })

            const { token, refreshToken } = jwt.generatePairFor(user)

            // console.table({ plainToken, plainRefreshToken })

            res.status(201).send({ user, token, refreshToken })
        } catch (error) {
            next(error)
        }
    })
    .put("/", async (req, res, next) => {
        const { nick, digest, signedDigest } = req.body

        if ([nick, digest, signedDigest].indexOf(undefined) > -1) {
            return next(createHttpError(400, "Missing parameters"))
        }

        const user = await User.findOne({ nick })

        if (!user) {
            return next(createHttpError(404, "User not found"))
        }

        const publicKey = pki.publicKeyFromPem(user.publicKey)

        if (publicKey.verify(util.decode64(digest), util.decode64(signedDigest))) {
            user.digest = await bcrypt.hash(digest, 12)
            await user.save()
        }

        const { token, refreshToken } = jwt.generatePairFor(user)

        res.status(200).send({ user, token, refreshToken })

    })
    .post("/session", async (req, res, next) => {
        try {
            const { nick, digest } = req.body

            if (!nick || !digest) {
                return next(createHttpError(400, "MISSING_CREDENTIALS"))
            }
            const user = await User.findOne({ nick })

            if (!user || !(await user.checkDigest(digest))) {
                return res.status(401).json({
                    error: "Invalid credentials"
                })
            }

            const { token, refreshToken } = jwt.generatePairFor(user)

            res.status(200).send({ user, token, refreshToken })
        } catch (e) {
            next(e)
        }
    })
    .delete("/me", jwtGuard, async (req, res, next) => {
        try {
            const user = await User.findById(req.user)

            if (!user) {
                return res.status(404).send({ error: "This user does not exist." })
            }

            await user.remove()

            res.status(204).send()
        } catch (e) {
            next(e)
        }
    })

export default usersRouter