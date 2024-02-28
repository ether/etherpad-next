import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { settingsLoaded } from '@/server';
import { FastifyInstance } from 'fastify';


export const initFastifyPlugins = async (fastifyServer: FastifyInstance) => {

  await fastifyServer.register(fastifySwagger, {
    swagger: {
      info: {
        title: 'Swagger UI for Etherpad next',
        description: 'API documentation for Etherpad next',
        version: settingsLoaded.getEpVersion(),
      },
      externalDocs: {
        url: 'https://etherpad.org',
        description: 'Find more info here',
      },
      host: `localhost:${settingsLoaded.port}`,
      schemes: ['http'],
      consumes: ['application/json'],
      produces: ['application/json'],
      tags: [
        { name: 'pad', description: 'Pad related end-points' },
        { name: 'author', description: 'Author related end-points' },
        { name: 'group', description: 'Group related end-points' },
        { name: 'session', description: 'Session related end-points' },
      ],
      securityDefinitions: {
        apiKey: {
          type: 'apiKey',
          name: 'apiKey',
          in: 'query',
        },
      },
    },
  });

  await fastifyServer.register(fastifySwaggerUi, {
    routePrefix: '/api-docs',
    uiConfig: {
      docExpansion: 'full',
      deepLinking: false,
    },
    staticCSP: true,
    transformStaticCSP: header => header,
    transformSpecification: (swaggerObject, request, reply) => {
      return swaggerObject;
    },
    transformSpecificationClone: true,
  });
};
