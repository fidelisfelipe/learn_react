import { FastifyInstance } from "fastify"
import ShortUniqueId from "short-unique-id"
import { z } from "zod"
import { prisma } from "../lib/prisma"
import { authenticate } from "../plugins/authenticate"

export async function poolRoutes(fastify: FastifyInstance) {
    fastify.get('/pools/count', async () => {
        const count = await prisma.pool.count()

        return { count }
    })


    fastify.post('/pools', async (request, reply) => {
        const createPoolBody = z.object({
            title: z.string(),
        })

        const { title } = createPoolBody.parse(request.body)

        const generate = new ShortUniqueId({ length: 6 })
        const code = String(generate()).toUpperCase()

        try {
            await request.jwtVerify()

            await prisma.pool.create({
                data: {
                    title,
                    code,
                    ownerId: request.user.sub,
                    participant: {
                        create: {
                            userId: request.user.sub
                        }
                    }
                }
            })

        } catch {
            await prisma.pool.create({
                data: {
                    title,
                    code,
                }
            })
        }



        return reply.status(201).send({ code })
    })

    fastify.get('/pools/:id', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        const getPoolParams = z.object({
            id:z.string(),
        })

        const { id } = getPoolParams.parse(request.params)

        const pool = await prisma.pool.findUnique({
            where: {
                id,
            },
            include: {
                _count:{
                    select:{
                        participant: true,
                    }
                },
                participant:{
                    select: {
                        id: true,
                        user: {
                            select:{
                                avatarUrl: true,
                            }
                        }
                    },
                    take: 4,
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
            }
        })

        return { pool }

    })

    fastify.post('/pools/join', {
        onRequest: [authenticate]
    }, async (request, reply) => {
            const joinPoolBody = z.object({
                code: z.string()
            })

            const { code } = joinPoolBody.parse(request.body)

            const pool = await prisma.pool.findUnique({
                where: {
                    code,
                },
                include: {
                    participant: {
                        where: {
                            userId: request.user.sub
                        }
                    }
                }
            })

            if (!pool) {
                return reply.status(400).send({
                    message: 'Pool not found.'
                })
            }

            if (pool.participant.length > 0) {
                return reply.status(400).send({
                    message: 'Pool already joined this pool.'
                })
            }

            if (!pool.ownerId) {
                prisma.pool.update({
                    where: {
                        id: pool.id,
                    },
                    data: {
                        ownerId: request.user.sub
                    }
                })
            }

            prisma.participant.create({
                data: {
                    poolId: pool.id,
                    userId: request.user.sub
                }
            })

            return reply.status(201).send()
    })


    
    fastify.get('/pools', {
        onRequest: [ authenticate]
    },async(request) => {
        const pools = await prisma.pool.findMany({
            where: {
                participant: {
                    some: {
                        userId: request.user.sub,
                    }
                }
            },
            include: {
                _count:{
                    select:{
                        participant: true,
                    }
                },
                participant:{
                    select: {
                        id: true,
                        user: {
                            select:{
                                avatarUrl: true,
                            }
                        }
                    },
                    take: 4,
                },
                owner: {
                    select: {
                        id: true,
                        name: true,
                    }
                },
            }
        })
        return { pools}
    })

   

    

}

