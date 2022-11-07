import { FastifyInstance } from "fastify"
import {  z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function authRoutes(fastify: FastifyInstance){

    fastify.get('/me', 
        {
            onRequest: [authenticate],
        },
        async (request) => {
            return {user: request.user }
        }
    ),

    fastify.post('/users/oauth', async (request) => {
        const createUserBody = z.object({
            access_token: z.string(),
        })

        const {access_token} = createUserBody.parse(request.body)

        //const userResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        //    method: 'GET',
        //    headers: {
        //        Authorization: `Bearer ${access_token}`,
        //    }
        //})

        const userInfoFake = {
            id:'1',
            email: 'usuario@gmail.com',
            name: 'meu nome',
            picture: 'https://github.com/fidelisfelipe.png'
        }

        const userData = userInfoFake;//await userResponse.json()

        const userInfoSchema = z.object({
            id: z.string(),
            email: z.string(),
            name: z.string(),
            picture: z.string().url(),
        })

        const userInfo = userInfoSchema.parse(userData)

        let user = await prisma.user.findUnique({
            where: {
                email: userInfo.email
            }
        })

        if(!user) {
            user = await prisma.user.create({
                data: {
                    id: userInfo.id,
                    email: userInfo.email,
                    name: userInfo.name,
                    avatarUrl: userInfo.picture,
                }
            })
        }

        console.log(userInfo);

        const token = fastify.jwt.sign({
            name: userInfo.name,
            avatarUrl: userInfo.picture
        },
        {
            sub: userInfo.id,
            expiresIn: '7 days'//expiração em prod deve ser menor
        }
        )

        return { token }
    })    
}
