import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'
import { authenticate } from '../plugins/authenticate'
import dayjs from 'dayjs'
import ptbr from 'dayjs/locale/pt-br'

export async function gameRoutes(fastify: FastifyInstance){
    fastify.get('/games/count', async () => {
        const count = await prisma.game.count()
    
        return { count }
    })

    fastify.get('/games', async () => {
        const games = await prisma.game.findMany();
    
        const dataFormated = dayjs(games[0].date).locale(ptbr).format('DD [de] MMMM [de] YYYY [às] HH:00[h]');



        return { games,dataFormated }
    })

    fastify.get('/games/:id', {
        onRequest: [authenticate]
    }, async (request, reply) => {
        const getPoolParams = z.object({
            id:z.string(),
        })

        const { id } = getPoolParams.parse(request.params)

        const games = await prisma.game.findMany({
            orderBy: {
                date: 'desc',
            },
            include: {
                guesses: {
                    where: {
                        participant: {
                            userId: request.user.sub,
                            poolId: id,
                        }
                    }
                }
            }
        })

        return { 
            games: games.map(game => {
                return {
                    ...game,
                    guess: game.guesses.length > 0 ? game.guesses[0] : null,
                    guesses: undefined
                }
            })
         }
    })
}

