import { FastifyRequest } from "fastify";

export async function authenticate(request: FastifyRequest){
    request.jwtVerify()
}