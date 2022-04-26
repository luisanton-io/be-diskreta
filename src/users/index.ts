import express from "express"
import jwt from "jsonwebtoken"
import User from "./model"
import bcrypt from "bcrypt"
import createHttpError from "http-errors"
import { AES, enc } from "crypto-js"
import { pki } from "node-forge"

const usersRouter = express.Router()



usersRouter
    .get("/", async (req, res, next) => {
        try {
            const { nick } = req.query

            const n = new RegExp("^" + nick, "i")
            const users = await User.find(nick ? { nick: n } : {})
            res.send(users)
        } catch (error) {
            next(error)
        }
    })
    .post("/", async (req, res, next) => {
        try {
            const password = await bcrypt.hash(req.body.password, 12)
            const user = new User({
                ...req.body,
                password
            })
            await user.save()

            const publicKey = pki.publicKeyFromPem(req.body.publicKey)

            const plainToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)
            const token = publicKey.encrypt(plainToken)

            console.log(token, user)

            res.status(201).send({ token, user })
        } catch (error) {
            next(error)
        }
    })
    .post("/session", async (req, res, next) => {
        try {
            const { nick, password } = req.body

            if (!nick || !password) {
                return next(createHttpError(400, "MISSING_CREDENTIALS"))
            }
            const user = await User.findOne({ nick })

            if (!user || !(await user.checkPassword(password))) {
                return res.status(401).json({
                    error: "Invalid credentials"
                })
            }

            const publicKey = pki.publicKeyFromPem(user.publicKey)

            const plainToken = jwt.sign({ _id: user._id }, process.env.JWT_SECRET!)
            const token = publicKey.encrypt(plainToken)

            res.status(200).send({ token, user })
        } catch (e) {
            next(e)
        }
    })

export default usersRouter