import { EVENT_EMITTER } from '@/hooks/Hook';
import { FastifyInstance } from 'fastify';

EVENT_EMITTER.on('fastifyServerPreReady',  (fastifyServer: FastifyInstance) => {
  console.log('fastifyServerPreReady');

});
