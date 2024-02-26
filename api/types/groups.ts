import { FastifyRequest } from 'fastify';

// Define the interface for the query parameters
interface QueryParams {
  param1?: string;
  param2?: string;
}

// Use the interface as a type argument for FastifyRequest
export type MyRequest = FastifyRequest<{ Querystring: QueryParams }>;
